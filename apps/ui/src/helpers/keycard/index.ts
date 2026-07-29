import { Wallet } from '@ethersproject/wallet';
import { ApiKey } from './types';

const KEYCARD_URL = 'https://keycard.snapshot.org';

const DOMAIN = {
  name: 'snapshot',
  version: '0.1.4'
};

const GetKeysSchema = {
  GetKeys: [
    { name: 'from', type: 'string' },
    { name: 'alias', type: 'address' },
    { name: 'timestamp', type: 'uint64' }
  ]
};

async function rpcCall(method: string, params: any) {
  const res = await fetch(KEYCARD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: null
    })
  });

  const { error, result } = await res.json();
  if (error)
    throw new Error(error.data || error.message, { cause: error.code });

  return result;
}

export async function fetchKeys(
  alias: Wallet,
  from: string
): Promise<ApiKey[]> {
  const message = {
    from,
    alias: alias.address,
    timestamp: Math.floor(Date.now() / 1000)
  };
  const sig = await alias._signTypedData(DOMAIN, GetKeysSchema, message);

  const { keys } = await rpcCall('get_keys_by_owner', { ...message, sig });

  return keys;
}
