/**
 * One-off repair for proposal executions indexed before #2252.
 *
 * Until #2252 the ERC-20 branch of `utils.execution.decodeExecution` built
 * `_form.recipient` from the call target, which for a token transfer is the
 * token contract rather than the payee. The indexer persists the decoded
 * execution into `proposalmetadataitems.execution`, so fixing the decoder only
 * corrected proposals indexed after the deploy. Rows written before it still
 * name the token contract as the recipient.
 *
 * This script re-derives the recipient from the calldata already stored on each
 * row and emits guarded UPDATE statements on stdout:
 *
 *   bun run src/scripts/repairErc20TransferRecipients.ts > repair.sql
 *   psql "$DATABASE_URL" -f repair.sql
 *
 * Only `_form.recipient` is rewritten. `to`, `data`, `value` and the token
 * metadata are left byte-identical, and each statement is guarded on the exact
 * pre-image of `execution`, so the script is idempotent and a no-op against a
 * row that has already been repaired or re-indexed.
 */
import { getAddress } from 'viem';

const API_URL = process.env.API_URL || 'https://api.snapshot.box';

// transfer(address,uint256): selector plus exactly two 32-byte words. A shorter
// or longer payload is not a well-formed transfer, so we leave it alone rather
// than invent a recipient for it.
const ERC20_TRANSFER_CALLDATA = /^0xa9059cbb[0-9a-fA-F]{128}$/;

type ExecutionTransaction = {
  _type: string;
  to: string;
  data: string;
  value: string;
  _form: { recipient?: string; [key: string]: unknown };
  [key: string]: unknown;
};

export function decodeTransferRecipient(calldata: string): string | null {
  if (!ERC20_TRANSFER_CALLDATA.test(calldata)) return null;

  return getAddress(`0x${calldata.slice(34, 74)}`);
}

export type Repair = {
  /** Index of the transaction inside the execution array. */
  index: number;
  /** Recipient currently stored, always the token contract. */
  from: string;
  /** Recipient decoded from the calldata. */
  to: string;
};

/**
 * Lists the `_form.recipient` values that need rewriting in an execution
 * payload. Empty when the row is already correct or carries nothing decodable,
 * so callers can skip it.
 */
export function findRepairs(execution: string): Repair[] {
  let transactions: ExecutionTransaction[];
  try {
    transactions = JSON.parse(execution);
  } catch {
    return [];
  }

  if (!Array.isArray(transactions)) return [];

  const repairs: Repair[] = [];

  transactions.forEach((transaction, index) => {
    if (transaction?._type !== 'sendToken') return;

    const to = decodeTransferRecipient(transaction.data ?? '');
    if (!to) return;

    const from = transaction._form?.recipient;
    if (typeof from !== 'string') return;

    // Compare case-insensitively rather than through getAddress, which throws
    // on anything that is not a valid address.
    if (from.toLowerCase() === to.toLowerCase()) return;

    repairs.push({ index, from, to });
  });

  return repairs;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Rewrites a single `_form.recipient` in place. Guarded on the value we expect
 * to find there, so re-running is a no-op and a row that has since been
 * re-indexed correctly is left untouched.
 */
export function buildUpdateStatement(
  metadataId: string,
  repair: Repair
): string {
  const path = `{${repair.index},_form,recipient}`;

  return [
    'UPDATE proposalmetadataitems',
    `SET execution = jsonb_set(execution::jsonb, ${quote(path)}, ${quote(
      JSON.stringify(repair.to)
    )}::jsonb)::text`,
    `WHERE id = ${quote(metadataId)}`,
    '  AND upper_inf(block_range)',
    `  AND execution::jsonb #>> ${quote(path)} = ${quote(repair.from)};`
  ].join('\n');
}

const SPACES_QUERY = `
  query Spaces {
    spaces(first: 500) {
      id
      protocol
    }
  }
`;

const PROPOSALS_QUERY = `
  query Proposals($space: String!, $skip: Int!) {
    proposals(
      first: 100
      skip: $skip
      where: { space: $space }
      orderBy: created
      orderDirection: desc
    ) {
      proposal_id
      metadata {
        id
        execution
      }
    }
  }
`;

// Only these two protocols run calldata through the decoder. Snapshot X
// proposals carry an author-supplied execution from IPFS and were never
// affected.
const AFFECTED_PROTOCOLS = ['@openzeppelin/governor', 'governor-bravo'];

async function query<T>(document: string, variables = {}): Promise<T> {
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: document, variables })
  });

  if (!res.ok) throw new Error(`API returned ${res.status}`);

  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(JSON.stringify(errors));

  return data as T;
}

async function main() {
  const { spaces } = await query<{
    spaces: { id: string; protocol: string }[];
  }>(SPACES_QUERY);

  const affectedSpaces = spaces.filter(space =>
    AFFECTED_PROTOCOLS.includes(space.protocol)
  );

  const statements: string[] = [];
  let scanned = 0;

  for (const space of affectedSpaces) {
    for (let skip = 0; ; skip += 100) {
      const { proposals } = await query<{
        proposals: {
          proposal_id: string;
          metadata: { id: string; execution: string | null } | null;
        }[];
      }>(PROPOSALS_QUERY, { space: space.id, skip });

      for (const proposal of proposals) {
        scanned += 1;

        const { id, execution } = proposal.metadata ?? {};
        if (!id || !execution) continue;

        for (const repair of findRepairs(execution)) {
          statements.push(buildUpdateStatement(id, repair));
        }
      }

      if (proposals.length < 100) break;
    }
  }

  process.stdout.write('BEGIN;\n\n');
  process.stdout.write(statements.join('\n\n'));
  process.stdout.write('\n\nCOMMIT;\n');
  process.stderr.write(
    `scanned ${scanned} proposals in ${affectedSpaces.length} spaces, ` +
      `${statements.length} need repair\n`
  );
}

if (require.main === module) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err}\n`);
    process.exit(1);
  });
}
