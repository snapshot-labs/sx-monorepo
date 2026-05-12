import 'dotenv/config';
import db from '../src/helpers/mysql';

// Usage: bunx ts-node scripts/refresh_spaces_counters.ts
async function main() {
  const spaces = await db.queryAsync(`SELECT COUNT(*) as count FROM spaces`);
  console.log(`Found ${spaces[0].count} spaces`);

  const verifiedSpacesCount = await db.queryAsync(
    'SELECT COUNT(*) as count FROM spaces WHERE verified = 1'
  );
  console.log(`Found ${verifiedSpacesCount[0].count} verified spaces`);

  console.log('Updating vote count for verified spaces');
  await db.queryAsync(
    `UPDATE spaces SET vote_count = (
    COALESCE((
      SELECT SUM(vote_count) FROM leaderboard WHERE space = spaces.id GROUP BY space
    ), 0)
  ) WHERE verified = 1`
  );

  console.log('Updating vote count for unverified spaces');
  await db.queryAsync(
    `UPDATE spaces SET vote_count = (
    COALESCE((
      SELECT SUM(vote_count) FROM leaderboard WHERE space = spaces.id GROUP BY space
    ), 0)
  ) WHERE verified = 0`
  );

  console.log('Updating proposal count');
  await db.queryAsync(
    'UPDATE spaces SET proposal_count = (SELECT count(id) from proposals WHERE space = spaces.id)'
  );

  console.log('Updating follower count');
  await db.queryAsync(
    'UPDATE spaces SET follower_count = (SELECT count(id) from follows WHERE space = spaces.id)'
  );
  console.log('Done! ✅');
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
