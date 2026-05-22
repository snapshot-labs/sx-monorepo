import 'dotenv/config';
import db from '../src/helpers/mysql';

// Usage: bunx ts-node scripts/init_leaderboard_counters.ts --pivot TIMESTAMP
async function main() {
  let pivot: number | null = null;

  process.argv.forEach((arg, index) => {
    if (arg === '--pivot') {
      if (!process.argv[index + 1]) throw new Error('Pivot timestamp is missing');
      console.log('Filtered by votes.created >=', process.argv[index + 1]);
      pivot = +process.argv[index + 1].trim();
    }
  });

  if (!pivot) {
    const firstVoted = await db.queryAsync(
      'SELECT created FROM votes ORDER BY created ASC LIMIT 1'
    );
    if (!firstVoted.length) throw new Error('No votes found in the database');
    pivot = firstVoted[0].created as number;
  }

  await processVotesCount(pivot);
}

async function processVotesCount(pivot: number) {
  const processedVoters = new Set<string>();
  const batchWindow = 60 * 60 * 24; // 1 day
  let _pivot = pivot;

  while (_pivot < Date.now() / 1000) {
    console.log(`Processing voters from ${_pivot} to ${_pivot + batchWindow}`);
    const votersId = await db
      .queryAsync(
        `SELECT voter FROM votes WHERE created >= ?
      AND created < ?
      ORDER BY created ASC`,
        [_pivot, _pivot + batchWindow]
      )
      .map(v => v.voter);
    const startTs = +new Date() / 1000;
    let count = 0;
    const newVoters = Array.from(new Set<string>(votersId.values())).filter(
      v => !processedVoters.has(v)
    );

    console.log(`Found ${newVoters.length} new voters`);

    for (const id of newVoters) {
      processedVoters.add(id);

      process.stdout.write(`\n${id} `);
      const votes = await db.queryAsync(
        'SELECT space, voter, COUNT(voter) as votes_count, MAX(created) as last_vote FROM votes WHERE voter = ? AND created > ? AND created <= ? GROUP BY space',
        [id, _pivot, _pivot + batchWindow]
      );

      votes.forEach(async vote => {
        await db.queryAsync(
          `
            INSERT INTO leaderboard (vote_count, last_vote, user, space)
            VALUES(?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE vote_count = ?, last_vote = ?
            `,
          [vote.votes_count, vote.last_vote, id, vote.space, vote.votes_count, vote.last_vote]
        );

        process.stdout.write('.');
      });

      count += 1;
    }

    _pivot = _pivot + batchWindow;
    console.log(
      `\nProcessed ${count} voters (${Math.round(
        count / Math.max(+new Date() / 1000 - startTs, 1)
      )} voters/s)`
    );
  }

  console.log(`\nProcessed ${processedVoters.size} voters in total`);
}

(async () => {
  try {
    await main();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
