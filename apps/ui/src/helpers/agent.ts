import { Wallet } from '@ethersproject/wallet';

export const AGENT_URL: string = import.meta.env.VITE_AGENT_URL || '';

export const isAgentVotingAvailable = !!AGENT_URL;

const DOMAIN = {
  name: 'snapshot-agent',
  version: '0.1.0'
};

const SET_CONTEXT_TYPES = {
  SetContext: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'space', type: 'string' },
    { name: 'context', type: 'string' }
  ]
};

const GET_CONTEXT_TYPES = {
  GetContext: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'timestamp', type: 'uint64' }
  ]
};

export type SpaceContext = {
  space: string;
  context: string;
};

async function send<T>(
  path: string,
  alias: Wallet,
  types: Record<string, { name: string; type: string }[]>,
  message: Record<string, unknown>
): Promise<T> {
  const sig = await alias._signTypedData(DOMAIN, types, message);

  const res = await fetch(`${AGENT_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...message, sig })
  });

  if (!res.ok) {
    throw new Error(`Agent request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function fetchContexts(
  alias: Wallet,
  from: string
): Promise<SpaceContext[]> {
  const { contexts } = await send<{ contexts: SpaceContext[] }>(
    '/context/get',
    alias,
    GET_CONTEXT_TYPES,
    {
      from,
      alias: alias.address,
      timestamp: Math.floor(Date.now() / 1000)
    }
  );

  return contexts;
}

export async function saveContext(
  alias: Wallet,
  from: string,
  space: string,
  context: string
): Promise<void> {
  await send('/context/set', alias, SET_CONTEXT_TYPES, {
    from,
    alias: alias.address,
    timestamp: Math.floor(Date.now() / 1000),
    space,
    context
  });
}
