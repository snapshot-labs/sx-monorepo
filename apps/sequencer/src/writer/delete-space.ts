import { capture } from '@snapshot-labs/snapshot-sentry';
import { getSpace } from '../helpers/actions';
import log from '../helpers/log';
import db from '../helpers/mysql';
import { getSpaceController, jsonParse } from '../helpers/utils';

const SNAPSHOT_ENV = process.env.NETWORK || 'testnet';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const space = await getSpace(msg.space);
  if (!space) return Promise.reject('space not found');

  const controller = await getSpaceController(msg.space, SNAPSHOT_ENV);
  const isController = controller === body.address;
  if (!isController) return Promise.reject('not allowed');
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  const space = msg.space;

  try {
    const query = `
      UPDATE spaces SET deleted = 1 WHERE id = ? LIMIT 1;
      DELETE FROM leaderboard WHERE space = ?;
    `;

    await db.queryAsync(query, [space, space]);
  } catch (err) {
    capture(err, { space });
    log.warn('[writer] Failed to store settings', space, err);
    return Promise.reject('failed store settings');
  }
}
