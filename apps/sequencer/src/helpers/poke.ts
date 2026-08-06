import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import { addOrUpdateSpace } from './actions';
import { BROVIDER_URL } from './provider';

type Space = Record<string, any>;

const DEFAULT_NETWORK = process.env.DEFAULT_NETWORK ?? '1';

export default async function poke(id: string): Promise<Space> {
  const space = await getSpaceENS(id);

  try {
    if (snapshot.utils.validateSchema(snapshot.schemas.space, space) !== true) {
      return Promise.reject('invalid space format');
    }

    await addOrUpdateSpace(id, space);

    return space;
  } catch (err: any) {
    capture(err);
    return Promise.reject('unable to save the space');
  }
}

async function getSpaceENS(id: string): Promise<Space> {
  const uri = await snapshot.utils.getSpaceUri(id, DEFAULT_NETWORK, {
    broviderUrl: BROVIDER_URL
  });

  if (uri) {
    if (!isValidUri(uri)) {
      return Promise.reject('TXT record is not a valid uri');
    }

    try {
      return await snapshot.utils.getJSON(uri, {
        gateways: ['pineapple.fyi']
      });
    } catch {
      return Promise.reject(`${uri} is not a valid JSON file`);
    }
  }

  return Promise.reject(`missing snapshot TXT record on ENS name ${id}`);
}

function isValidUri(uri: string): boolean {
  return /^(ip[fn]s|https?):\/\//.test(uri);
}
