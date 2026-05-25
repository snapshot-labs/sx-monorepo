const SNAPSHOT_API_URL =
  process.env.SNAPSHOT_API_URL ?? 'https://hub.snapshot.org/graphql';

export async function gql<T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(SNAPSHOT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.SNAPSHOT_API_KEY !== undefined && {
        'x-api-key': process.env.SNAPSHOT_API_KEY
      })
    },
    body: JSON.stringify({ query, variables })
  });
  const json = (await res.json()) as {
    data: T | null;
    errors?: { message: string }[];
  };
  if (json.data === null || json.data === undefined) {
    throw new Error(json.errors?.[0]?.message ?? 'GraphQL returned no data');
  }
  return json.data;
}

export async function getProposalSnapshotBlock(
  chainId: number
): Promise<number> {
  const res = await fetch(`https://rpc.snapshot.org/${chainId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber' })
  });
  const { result } = (await res.json()) as { result: string };
  return Math.max(0, parseInt(result, 16) - 4);
}
