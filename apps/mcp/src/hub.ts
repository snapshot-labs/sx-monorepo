const SNAPSHOT_API_URL =
  process.env.SNAPSHOT_API_URL ?? 'https://hub.snapshot.org/graphql';

// Reorg buffer (mirrors sx-monorepo's EDITOR_SNAPSHOT_OFFSET).
const SNAPSHOT_BLOCK_OFFSET = 4;

export async function getProposalSnapshotBlock(
  chainId: number
): Promise<number> {
  const res = await fetch(`https://rpc.brovider.xyz/${chainId}?client=mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber' })
  });
  const { result } = (await res.json()) as { result: string };
  return Math.max(0, parseInt(result, 16) - SNAPSHOT_BLOCK_OFFSET);
}

export async function gql(
  query: string,
  variables?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(SNAPSHOT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.SNAPSHOT_API_KEY && {
        'x-api-key': process.env.SNAPSHOT_API_KEY
      })
    },
    body: JSON.stringify({ query, variables })
  });

  const json = (await res.json()) as {
    data: Record<string, unknown> | null;
    errors?: { message: string }[];
  };

  if (!json.data) {
    throw new Error(json.errors?.[0]?.message ?? 'GraphQL returned no data');
  }

  return json.data;
}

export async function resolveUserFromAlias(
  alias: string
): Promise<string | undefined> {
  const result = (await gql(
    `query Aliases($where: AliasWhere) {
      aliases(first: 1, skip: 0, where: $where) { address }
    }`,
    { where: { alias } }
  )) as { aliases?: { address: string }[] };
  return result.aliases?.[0]?.address;
}

const BUILTIN_TYPES = new Set(['String', 'Boolean', 'Int', 'Float', 'ID']);

const REMOVED_QUERIES = new Set([
  'options',
  'plugins',
  'skins',
  'subscriptions',
  'messages'
]);

export const schemaCache: Promise<unknown> = gql(`{
  __schema {
    queryType {
      fields {
        name
        description
        args { name type { name kind ofType { name kind ofType { name kind } } } }
        type { name kind ofType { name kind } }
      }
    }
    types {
      name
      kind
      description
      fields { name type { name kind ofType { name kind } } }
      inputFields { name type { name kind ofType { name kind } } }
      enumValues { name }
    }
  }
}`).then(data => {
  const schema = data.__schema as {
    queryType: { fields: { name: string }[] };
    types: { name: string }[];
  };
  schema.types = schema.types.filter(
    t => !t.name.startsWith('__') && !BUILTIN_TYPES.has(t.name)
  );
  schema.queryType.fields = schema.queryType.fields.filter(
    f => !REMOVED_QUERIES.has(f.name)
  );

  return schema;
});
