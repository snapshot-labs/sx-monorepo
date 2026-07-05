const SNAPSHOT_HUB_URL =
  process.env.SNAPSHOT_HUB_URL ?? 'https://hub.snapshot.org/graphql';
const SNAPSHOT_API_URL =
  process.env.SNAPSHOT_API_URL ?? 'https://api.snapshot.box';

// Reorg buffer (mirrors sx-monorepo's EDITOR_SNAPSHOT_OFFSET).
const SNAPSHOT_BLOCK_OFFSET = 4;

export async function getProposalSnapshotBlock(
  chainId: number
): Promise<number> {
  const res = await fetch(`https://rpc.snapshot.org/${chainId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber' })
  });
  const { result } = (await res.json()) as { result: string };
  return Math.max(0, parseInt(result, 16) - SNAPSHOT_BLOCK_OFFSET);
}

async function request(
  url: string,
  query: string,
  variables?: Record<string, unknown>,
  apiKey?: string
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { 'x-api-key': apiKey })
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

type Gql = (
  query: string,
  variables?: Record<string, unknown>
) => Promise<Record<string, unknown>>;

export const hubGql: Gql = (query, variables) =>
  request(SNAPSHOT_HUB_URL, query, variables, process.env.SNAPSHOT_API_KEY);

export const apiGql: Gql = (query, variables) =>
  request(SNAPSHOT_API_URL, query, variables);

export async function resolveUserFromAlias(
  alias: string
): Promise<string | undefined> {
  const result = (await hubGql(
    `query Aliases($where: AliasWhere) {
      aliases(first: 1, skip: 0, where: $where) { address }
    }`,
    { where: { alias } }
  )) as { aliases?: { address: string }[] };
  return result.aliases?.[0]?.address;
}

const BUILTIN_TYPES = new Set(['String', 'Boolean', 'Int', 'Float', 'ID']);

async function loadSchema(
  api: Gql,
  removedQueries: Set<string>
): Promise<unknown> {
  const data = await api(`{
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
}`);
  const schema = data.__schema as {
    queryType: { fields: { name: string }[] };
    types: { name: string }[];
  };
  schema.types = schema.types.filter(
    t => !t.name.startsWith('__') && !BUILTIN_TYPES.has(t.name)
  );
  schema.queryType.fields = schema.queryType.fields.filter(
    f => !removedQueries.has(f.name)
  );

  return schema;
}

export const hubSchemaCache = loadSchema(
  hubGql,
  new Set(['options', 'plugins', 'skins', 'subscriptions', 'messages'])
);
// Checkpoint sync-state internals, not governance data.
export const apiSchemaCache = loadSchema(
  apiGql,
  new Set(['_checkpoint', '_checkpoints', '_metadata', '_metadatas'])
);
