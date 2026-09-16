import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import db from '../../helpers/mysql';

export default async function (parent, args) {
  const id = args.id;
  const query = `
    SELECT s.* FROM statements s
    INNER JOIN spaces sp ON sp.id = s.space
    WHERE s.id = ? AND sp.deleted = 0
    LIMIT 1
  `;
  try {
    const statements = await db.queryAsync(query, id);
    if (statements.length === 1) return statements[0];
    return null;
  } catch (err: any) {
    log.error(`[graphql] statement, ${JSON.stringify(err)}`);
    capture(err, { args });
    return Promise.reject(new Error('request failed'));
  }
}
