import { getAddress } from '@ethersproject/address';
import { capture } from '@snapshot-labs/snapshot-sentry';
import isEqual from 'lodash/isEqual';
import { addOrUpdateSpace, getSpace } from '../helpers/actions';
import log from '../helpers/log';
import db from '../helpers/mysql';
import { getLimit, getSpaceType } from '../helpers/options';
import { validateSpaceSettings } from '../helpers/spaceValidation';
import {
  addToWalletConnectWhitelist,
  clearStampCache,
  getSpaceController,
  jsonParse,
  removeFromWalletConnectWhitelist
} from '../helpers/utils';

const SNAPSHOT_ENV = process.env.NETWORK || 'testnet';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  if (msg.space.length > 64) {
    return Promise.reject('id too long');
  }
  const space = await getSpace(msg.space, true);

  try {
    await validateSpaceSettings({
      ...msg.payload,
      id: msg.space,
      deleted: space?.deleted,
      turbo: space?.turbo
    });
  } catch (err) {
    return Promise.reject(err);
  }

  const strategiesLimit = await getLimit(
    `space.${await getSpaceType(space)}.strategies_limit`
  );

  if (msg.payload.strategies.length > strategiesLimit) {
    return Promise.reject(`max number of strategies is ${strategiesLimit}`);
  }

  const controller = await getSpaceController(msg.space, SNAPSHOT_ENV);
  let isController = false;
  try {
    isController = getAddress(controller) === getAddress(body.address);
  } catch {
    isController = false;
  }

  const admins = (space?.admins || []).map(admin => admin.toLowerCase());
  const isAdmin = admins.includes(body.address.toLowerCase());
  const newAdmins = (msg.payload.admins || []).map(admin =>
    admin.toLowerCase()
  );

  if (!space?.turbo && !space?.domain) {
    if (msg.payload.domain)
      return Promise.reject('domain is a turbo feature only');
    if (msg.payload.skinSettings)
      return Promise.reject('skin is a turbo feature only');
  }

  const anotherSpaceWithDomain = (
    await db.queryAsync(
      'SELECT 1 FROM spaces WHERE domain = ? AND id != ? LIMIT 1',
      [msg.payload.domain, msg.space]
    )
  )[0];

  if (msg.payload.domain && anotherSpaceWithDomain) {
    return Promise.reject('domain already taken');
  }

  if (!isAdmin && !isController) return Promise.reject('not allowed');

  if (!isController && !isEqual(admins, newAdmins))
    return Promise.reject('not allowed change admins');

  const labels = msg.payload.labels || [];
  if (labels.length) {
    const uniqueLabelsIds = new Set<string>();
    const uniqueLabelsNames = new Set<string>();
    for (const { id, name } of labels) {
      const labelId = id.toLowerCase();
      const labelName = name.toLowerCase();
      if (uniqueLabelsIds.has(labelId)) {
        return Promise.reject('duplicate label id');
      }
      if (uniqueLabelsNames.has(labelName)) {
        return Promise.reject('duplicate label name');
      }
      uniqueLabelsIds.add(labelId);
      uniqueLabelsNames.add(labelName);
    }
  }
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  const space = msg.space.toLowerCase();
  const existingSpace = (
    await db.queryAsync(
      'SELECT domain, settings FROM spaces WHERE id = ? LIMIT 1',
      [space]
    )
  )?.[0];
  const existingSettings = JSON.parse(existingSpace?.settings || '{}');

  try {
    await addOrUpdateSpace(space, msg.payload);
  } catch (err) {
    capture(err, { space });
    log.warn(
      '[writer] Failed to store settings',
      msg.space,
      JSON.stringify(err)
    );
    return Promise.reject('failed store settings');
  }

  if (existingSettings.avatar !== msg.payload.avatar)
    await clearStampCache('space', space);

  if (existingSpace?.domain != msg.payload.domain) {
    await addToWalletConnectWhitelist(msg.payload.domain);
    await removeFromWalletConnectWhitelist(existingSpace?.domain);
  }
}
