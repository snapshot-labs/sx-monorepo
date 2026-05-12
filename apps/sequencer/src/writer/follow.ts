import db from '../helpers/mysql';
import { getLimit } from '../helpers/options';
import turboUsers from '../helpers/turboUsers.json';
import { DEFAULT_NETWORK_ID, NETWORK_IDS } from '../helpers/utils';

export const getFollowsCount = async (follower: string): Promise<number> => {
  const query = `
    SELECT COUNT(*) AS count
    FROM follows
    JOIN spaces ON spaces.id = follows.space
    WHERE follower = ? AND spaces.deleted = 0
  `;

  const [{ count }] = await db.queryAsync(query, [follower]);

  return count;
};

export async function verify(message): Promise<any> {
  const query = `SELECT * FROM follows WHERE follower = ? AND space = ? LIMIT 1`;
  const follows = await db.queryAsync(query, [message.from, message.space]);

  if (follows.length !== 0)
    return Promise.reject('you are already following this space');

  const plan = turboUsers
    .map(user => user.toLowerCase())
    .includes(message.from.toLowerCase())
    ? 'turbo'
    : 'default';

  const count = await getFollowsCount(message.from);
  const limit = await getLimit(`user.${plan}.follow_limit`);

  if (count >= limit) {
    return Promise.reject(`you can join max ${limit} spaces`);
  }

  if (message.network && !NETWORK_IDS.includes(message.network)) {
    return Promise.reject(`network ${message.network} is not allowed`);
  }

  return true;
}

export async function action(message, ipfs, _receipt, id): Promise<void> {
  const query = `
    INSERT INTO follows SET ?;
    UPDATE spaces SET follower_count = follower_count + 1 WHERE id = ?;
  `;
  const params = {
    id,
    ipfs,
    follower: message.from,
    space: message.space,
    network: message.network || DEFAULT_NETWORK_ID,
    created: message.timestamp
  };

  await db.queryAsync(query, [params, message.space]);
}
