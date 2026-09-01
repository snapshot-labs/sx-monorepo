import { verifyTypedData } from '@ethersproject/wallet';
import { getAliasOwner } from './clients/hub';

export const DOMAIN = {
  name: 'snapshot-agent',
  version: '0.1.0'
};

export const SET_CONTEXT_TYPES = {
  SetContext: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'space', type: 'string' },
    { name: 'context', type: 'string' }
  ]
};

export const GET_CONTEXT_TYPES = {
  GetContext: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'timestamp', type: 'uint64' }
  ]
};

const WINDOW = 5 * 60;

export type Signed<T> = T & {
  from: string;
  alias: string;
  timestamp: number;
  sig: string;
};

export async function verifySigner<T extends object>(
  types: Record<string, { name: string; type: string }[]>,
  body: Signed<T>,
  findOwner: (alias: string) => Promise<string | undefined> = getAliasOwner
): Promise<void> {
  const { sig, ...message } = body;
  const age = Math.abs(Math.floor(Date.now() / 1000) - message.timestamp);

  if (age > WINDOW) throw new Error('timestamp is too far off');

  let signer: string;
  try {
    signer = verifyTypedData(DOMAIN, types, message, sig);
  } catch {
    throw new Error('signature does not verify');
  }

  if (signer.toLowerCase() !== message.alias.toLowerCase()) {
    throw new Error('signature does not match the alias');
  }

  const owner = await findOwner(message.alias);
  if (owner?.toLowerCase() !== message.from.toLowerCase()) {
    throw new Error('alias does not belong to that address');
  }
}
