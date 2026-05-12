import snapshot from '@snapshot-labs/snapshot.js';
import log from '../helpers/log';
import db from '../helpers/mysql';
import { DEFAULT_NETWORK_ID, jsonParse, NETWORK_IDS } from '../helpers/utils';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg, {});
  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.statement,
    msg.payload
  );
  if (schemaIsValid !== true) {
    log.warn(
      `[writer] Wrong statement format ${JSON.stringify(schemaIsValid)}`
    );
    return Promise.reject('wrong statement format');
  }

  if (msg.payload.network && !NETWORK_IDS.includes(msg.payload.network)) {
    return Promise.reject(`network ${msg.payload.network} is not allowed`);
  }

  return true;
}

export async function action(body, ipfs, receipt, id): Promise<void> {
  const msg = jsonParse(body.msg);
  const space = msg.space;
  const delegate = body.address;
  const created = parseInt(msg.timestamp);
  const item = {
    id,
    ipfs,
    delegate,
    space,
    network: msg.payload.network || DEFAULT_NETWORK_ID,
    about: msg.payload.about,
    statement: msg.payload.statement,
    discourse: msg.payload.discourse || '',
    status: msg.payload.status || 'INACTIVE',
    created,
    updated: created,
    source: null
  };

  const query =
    'INSERT INTO statements SET ? ON DUPLICATE KEY UPDATE ipfs = ?, about = ?, statement = ?, discourse = ?, status = ?, updated = ?, source = NULL';
  const params = [
    item,
    item.ipfs,
    item.about,
    item.statement,
    item.discourse,
    item.status,
    item.created
  ];
  await db.queryAsync(query, params);
}
