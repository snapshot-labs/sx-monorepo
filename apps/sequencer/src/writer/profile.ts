import snapshot from '@snapshot-labs/snapshot.js';
import log from '../helpers/log';
import db from '../helpers/mysql';
import { clearStampCache, jsonParse } from '../helpers/utils';

export async function verify(body): Promise<any> {
  const profile = jsonParse(body.profile, {});
  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.profile,
    profile
  );
  if (schemaIsValid !== true) {
    log.warn(`[writer] Wrong profile format ${JSON.stringify(schemaIsValid)}`);
    return Promise.reject('wrong profile format');
  }

  return true;
}

export async function action(message, ipfs): Promise<void> {
  const profile = jsonParse(message.profile, {});

  const existingProfile =
    (
      await db.queryAsync(
        `SELECT
            JSON_UNQUOTE(profile->'$.name') as name,
            JSON_UNQUOTE(profile->'$.avatar') as avatar
          FROM users
          WHERE id = ?
          LIMIT 1
        `,
        [message.from]
      )
    )[0] || {};

  const params = {
    id: message.from,
    ipfs,
    created: message.timestamp,
    profile: JSON.stringify(profile)
  };

  await db.queryAsync('REPLACE INTO users SET ?', params);

  ['avatar', 'name'].forEach(async type => {
    if (profile[type] !== existingProfile[type])
      await clearStampCache(type, message.from);
  });
}
