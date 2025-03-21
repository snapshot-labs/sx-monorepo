import { pin } from '@snapshot-labs/pineapple';
import { create } from 'ipfs-http-client';

export type PinFunction = (
  payload: any
) => Promise<{ provider: string; cid: string }>;

function createIpfsPinner(name: string, url: string): PinFunction {
  const client = create({ url });

  return async (payload: any) => {
    const res = await client.add(JSON.stringify(payload), { pin: true });

    return {
      provider: name,
      cid: res.cid.toV0().toString()
    };
  };
}

export const pinGraph = createIpfsPinner(
  'graph',
  'https://api.thegraph.com/ipfs/api/v0'
);

export const pinMantle = createIpfsPinner(
  'mantle',
  'https://subgraph-api.mantle.xyz/ipfs'
);

export async function pinPineapple(payload: any) {
  const pinned = await pin(payload);
  if (!pinned) throw new Error('Failed to pin');

  return {
    provider: pinned.provider,
    cid: pinned.cid
  };
}
