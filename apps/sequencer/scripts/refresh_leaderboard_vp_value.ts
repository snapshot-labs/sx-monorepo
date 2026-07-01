import 'dotenv/config';
import db from '../src/helpers/mysql';

// Usage: yarn ts-node scripts/refresh_leaderboard_vp_value.ts [--space SPACE-ID] [--from SPACE-ID] [--dry-run] [--concurrency N]

const MIN_VOTES_PER_BATCH = 1000;
const PAIRS_PER_UPDATE = 500;
const DEFAULT_CONCURRENCY = 4;

type SpaceRow = { id: string; vote_count: number };
type Pair = { user: string; space: string };
type UpdateResult = { affectedRows: number; changedRows: number };
type ProcessResult = {
  affectedRows: number;
  changedRows: number;
  previewed: number;
};
type Args = {
  space: string | undefined;
  from: string | undefined;
  dryRun: boolean;
  concurrency: number;
};

async function updatePage(pairs: Pair[]): Promise<UpdateResult> {
  const placeholders = pairs.map(() => '(?, ?)').join(', ');
  const params = pairs.flatMap(p => [p.user, p.space]);
  return db.queryAsync(
    `UPDATE leaderboard l
     SET vp_value = COALESCE((
       SELECT SUM(v.vp_value) FROM votes v WHERE v.voter = l.user AND v.space = l.space
     ), 0)
     WHERE (l.user, l.space) IN (${placeholders})`,
    params
  );
}

// Vitess (PlanetScale's query layer) only allows correlated-subquery SET
// when the WHERE filter is a PK tuple — same shape as src/helpers/votesVpValue.ts.
async function processSpaces(
  spaces: SpaceRow[],
  dryRun: boolean
): Promise<ProcessResult> {
  const spaceIds = spaces.map(s => s.id);

  if (dryRun) {
    const [{ count }] = await db.queryAsync(
      'SELECT COUNT(*) AS count FROM leaderboard WHERE space IN (?)',
      [spaceIds]
    );
    return { affectedRows: 0, changedRows: 0, previewed: Number(count) };
  }

  let affected = 0;
  let changed = 0;
  let lastUser = '';
  let lastSpace = '';

  while (true) {
    const pairs: Pair[] = await db.queryAsync(
      `SELECT user, space FROM leaderboard
       WHERE space IN (?) AND (user > ? OR (user = ? AND space > ?))
       ORDER BY user, space
       LIMIT ?`,
      [spaceIds, lastUser, lastUser, lastSpace, PAIRS_PER_UPDATE]
    );
    if (pairs.length === 0) break;

    const result = await updatePage(pairs);
    affected += result.affectedRows;
    changed += result.changedRows;

    const last = pairs[pairs.length - 1];
    lastUser = last.user;
    lastSpace = last.space;
    if (pairs.length < PAIRS_PER_UPDATE) break;
  }

  return { affectedRows: affected, changedRows: changed, previewed: 0 };
}

function parseArgs(): Args {
  let space: string | undefined;
  let from: string | undefined;
  let dryRun = false;
  let concurrency = DEFAULT_CONCURRENCY;

  const readValue = (flag: string, index: number): string => {
    const value = process.argv[index + 1];
    if (!value || value.startsWith('--'))
      throw new Error(`Missing value for ${flag}`);
    return value;
  };

  process.argv.forEach((arg, index) => {
    if (arg === '--space') {
      space = readValue('--space', index).trim();
    }
    if (arg === '--from') {
      from = readValue('--from', index).trim();
    }
    if (arg === '--dry-run') {
      dryRun = true;
    }
    if (arg === '--concurrency') {
      const n = parseInt(readValue('--concurrency', index), 10);
      if (!Number.isFinite(n) || n < 1)
        throw new Error('Invalid --concurrency value');
      concurrency = n;
    }
  });

  if (space && from) throw new Error('Cannot pass both --space and --from');

  return { space, from, dryRun, concurrency };
}

function buildBatches(spaces: SpaceRow[]): SpaceRow[][] {
  const batches: SpaceRow[][] = [];
  let batch: SpaceRow[] = [];
  let batchVotes = 0;

  const flush = () => {
    if (batch.length === 0) return;
    batches.push(batch);
    batch = [];
    batchVotes = 0;
  };

  for (const spaceRow of spaces) {
    // Flush pending smalls before a whale so it processes alone
    if (spaceRow.vote_count >= MIN_VOTES_PER_BATCH) flush();

    batch.push(spaceRow);
    batchVotes += spaceRow.vote_count;

    if (batchVotes >= MIN_VOTES_PER_BATCH) flush();
  }
  flush();

  return batches;
}

async function main(): Promise<void> {
  const { space, from, dryRun, concurrency } = parseArgs();

  console.log('Space:', space || 'all');
  if (from) console.log('From:', from);
  if (dryRun) console.log('Dry run mode enabled');
  console.log(`Concurrency: ${concurrency}`);

  console.log('Fetching spaces...');
  const params: string[] = [];
  let whereClause = 's.deleted = 0';

  if (space) {
    whereClause += ' AND s.id = ?';
    params.push(space);
  } else if (from) {
    whereClause += ' AND s.id >= ?';
    params.push(from);
  }

  const spaces: SpaceRow[] = await db.queryAsync(
    `SELECT s.id, s.vote_count FROM spaces s WHERE ${whereClause} ORDER BY s.id`,
    params
  );
  console.log(`Found ${spaces.length} spaces to process`);

  const batches = buildBatches(spaces);
  console.log(`Built ${batches.length} batches`);

  let totalAffected = 0;
  let totalChanged = 0;
  let totalPreviewed = 0;
  let nextIdx = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIdx++;
      if (i >= batches.length) return;
      const batch = batches[i];
      const votes = batch.reduce((sum, s) => sum + s.vote_count, 0);
      console.log(
        `\n--- [${i + 1}/${batches.length}] ${batch.length} spaces (${votes} votes) ---`
      );
      console.log(`Spaces: ${batch.map(s => s.id).join(', ')}`);
      const result = await processSpaces(batch, dryRun);
      totalAffected += result.affectedRows;
      totalChanged += result.changedRows;
      totalPreviewed += result.previewed;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log('\n=== Summary ===');
  if (dryRun) {
    console.log(
      `Total leaderboard rows that would be examined: ${totalPreviewed}`
    );
  } else {
    console.log(`Affected: ${totalAffected}, Changed: ${totalChanged}`);
  }
}

(async () => {
  try {
    await main();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
