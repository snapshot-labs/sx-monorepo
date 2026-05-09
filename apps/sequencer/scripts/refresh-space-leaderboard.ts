import 'dotenv/config';
import db from '../src/helpers/mysql';

// Usage: bunx ts-node scripts/refresh-space-leaderboard.ts --space SPACE-ID
// This script assumes there are no active proposals in the space

async function getFirstAndLastVote(space: string) {
  const startArg = process.argv.indexOf('--start');
  const endArg = process.argv.indexOf('--end');
  let start = startArg !== -1 ? parseInt(process.argv[startArg + 1]) : null;
  let end = endArg !== -1 ? parseInt(process.argv[endArg + 1]) : null;

  console.log('Getting first and last vote for space', space);
  if (!start) {
    console.log('Start date is missing');
    const firstVoted = await db.queryAsync(
      `SELECT created FROM votes ${space ? 'WHERE space = ?' : ''} ORDER BY created ASC LIMIT 1`,
      space ? [space] : []
    );
    if (!firstVoted.length) throw new Error('No votes found in the database');
    start = firstVoted[0].created as number;
  }
  if (!end) {
    end = (
      await db.queryAsync(
        `SELECT created FROM votes ${space ? 'WHERE space = ?' : ''} ORDER BY created DESC LIMIT 1`,
        space ? [space] : []
      )
    )[0].created;
  }
  // @ts-ignore
  console.log('Will process votes from', new Date(start * 1000), 'to', new Date(end * 1000));

  return { firstVote: start, lastVote: end };
}

async function deleteLeaderboard(space: string) {
  console.log('Removing leaderboard for space', space);
  await db.queryAsync(`DELETE FROM leaderboard WHERE space = ?`, [space]);
  console.log('Leaderboard for space', space, 'has been removed');
}

async function processVotes(space: string, start: number, end: number) {
  console.log('Get votes from', new Date(start * 1000), start, 'to', new Date(end * 1000), end);

  await db.queryAsync(
    `INSERT INTO leaderboard (space, user, vote_count, last_vote)
      (SELECT space, voter AS user, COUNT(*) AS vote_count, MAX(created) AS last_vote
      FROM votes
      WHERE ${space ? 'space = ? AND' : ''} created >= ? AND created < ?
      GROUP BY space, voter)
    ON DUPLICATE KEY UPDATE vote_count = vote_count + VALUES(vote_count), last_vote = VALUES(last_vote)
  `,
    space ? [space, start, end] : [start, end]
  );
}

async function processProposalsCount(space: string) {
  console.log('Processing proposals counts for space', space);
  await db.queryAsync(
    `
    INSERT INTO leaderboard (space, user, proposal_count)
      (SELECT space, author AS user, COUNT(*) AS proposal_count
      FROM proposals
      ${space ? 'WHERE space = ?' : ''}
      GROUP BY space, author)
    ON DUPLICATE KEY UPDATE proposal_count = proposal_count + VALUES(proposal_count)
  `,
    space ? [space] : []
  );
  console.log('Proposals count for space', space, 'has been processed');
}

async function main(space) {
  if (space) await deleteLeaderboard(space);
  const { firstVote, lastVote } = await getFirstAndLastVote(space);

  // Process votes in chunks of 24 hours
  let start = firstVote;
  while (true) {
    const end = start + 86400; // 24 hours
    await processVotes(space, start, end);

    // @ts-ignore
    if (end > lastVote) break;
    start = end;
  }

  await processProposalsCount(space);
  process.exit(0);
}

const spaceArg = process.argv.indexOf('--space');
const space = spaceArg !== -1 ? process.argv[spaceArg + 1] : null;
if (spaceArg !== -1 && !space) throw new Error('Space ID is missing');
main(space);
