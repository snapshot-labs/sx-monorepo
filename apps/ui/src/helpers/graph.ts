import { create } from 'ipfs-http-client';

const client = create({ url: 'https://api.thegraph.com/ipfs/api/v0' });

export async function pinGraph(payload: any) {
  const res = await client.add(JSON.stringify(payload), { pin: true });

  return {
    provider: 'graph',
    cid: res.cid.toV0().toString()
  };
}
