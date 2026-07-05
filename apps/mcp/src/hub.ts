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
    throw new Error(hintFor(json.errors?.[0]?.message));
  }

  return json.data;
}

// GraphQL's enum/string mismatch errors repeat the value verbatim on both
// sides ('cannot represent non-enum value: "created"… Did you mean "created"?'),
// so the quote/unquote fix is invisible. Spell it out — the hub wants quoted
// strings for orderBy, the Snapshot API wants unquoted enums, a common trip-up.
function hintFor(message: string | undefined): string {
  if (!message) return 'GraphQL returned no data';
  if (/cannot represent non-enum value/.test(message))
    return `${message} (pass this argument as an unquoted enum, e.g. orderBy: created)`;
  if (/cannot represent a non string value/.test(message))
    return `${message} (pass this argument as a quoted string, e.g. orderBy: "created")`;
  return message;
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
): Promise<string> {
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
  // Drop introspection/builtin types and the generated filter/order input
  // types. The latter are ~90% of the payload and fully mechanical (a `where`
  // field per column plus _gt/_lt/_in/_contains… suffixes); that grammar is
  // documented on the query tools instead.
  schema.types = schema.types.filter(
    t =>
      !t.name.startsWith('_') &&
      !BUILTIN_TYPES.has(t.name) &&
      !/(_filter|_orderBy|Where)$/.test(t.name)
  );
  schema.queryType.fields = schema.queryType.fields.filter(
    f => !removedQueries.has(f.name)
  );

  // Serialize compact: the schema is machine-read, so indentation is dead weight.
  return JSON.stringify(schema);
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
