import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import db from './mysql';
import { EvmProvider, getProvider } from './provider';
import { fetchWithKeepAlive } from './utils';

type Space = {
  id: string;
  turbo_expiration: number;
  credits: string; // Snapshot Plus deposits, in gwei
};

type SpaceStatus = { id: string; turbo_expiration: number; credits: number };

const SCHNAPS_API_URL = process.env.SCHNAPS_API_URL;
const NETWORK_PREFIX = process.env.NETWORK === 'mainnet' ? 's:' : 's-tn:';
const RUN_INTERVAL = 10 * 1e3; // 10 seconds
const MAX_SPACES = 10_000;

// The schnaps-api indexer of each chain, with how many blocks it can lag
// behind (about 2 minutes) before its data is considered outdated
const EVM_INDEXERS: Record<string, { chainId: string; maxLag: number }> =
  process.env.NETWORK === 'mainnet'
    ? {
        eth: { chainId: '1', maxLag: 10 },
        base: { chainId: '8453', maxLag: 60 }
      }
    : { sep: { chainId: '11155111', maxLag: 10 } };

// Periodically sync the turbo status of spaces with the schnaps-api
export async function trackTurboStatuses() {
  if (!SCHNAPS_API_URL) return;

  while (true) {
    // Step 1: Query all the spaces from the schnaps-api
    const spaces = await getSpacesExpirationDates();

    // Step 2: Update the turbo status and credits of the spaces in the database
    await updateTurboStatuses(mergeSpaces(spaces)).catch(capture);

    // Sleep for a while before running the loop again
    await snapshot.utils.sleep(RUN_INTERVAL);
  }
}

// A space can have one row per payment source (each chain, Stripe), and Pro
// payments can name it in any case: keep the latest expiration, and add up
// the credits deposited on each chain
export function mergeSpaces(spaces: Space[]): SpaceStatus[] {
  const merged = new Map<string, SpaceStatus>();
  for (const { id, turbo_expiration, credits } of spaces) {
    if (!id.startsWith(NETWORK_PREFIX)) continue;
    const key = id.slice(NETWORK_PREFIX.length).toLowerCase();
    const prev = merged.get(key);
    merged.set(key, {
      id: key,
      turbo_expiration: Math.max(prev?.turbo_expiration ?? 0, turbo_expiration),
      credits: (prev?.credits ?? 0) + (Number(credits) || 0)
    });
  }
  return [...merged.values()];
}

export async function updateTurboStatuses(spaces: SpaceStatus[]) {
  if (spaces.length === 0) return;

  // Sync `turbo_expiration` and `credits_deposited` for each space. Ids are
  // matched exactly, whatever the column collation, so a look-alike id can
  // never overwrite another space
  const cases = spaces.map(() => 'WHEN ? THEN ?').join(' ');
  const query = `
    UPDATE spaces
    SET
      turbo_expiration = CASE CAST(id AS BINARY) ${cases} ELSE turbo_expiration END,
      credits_deposited = CASE CAST(id AS BINARY) ${cases} ELSE credits_deposited END
    WHERE id IN (?);
  `;

  // Flatten `spaces` array: [id1, expiration1, ..., id1, credits1, ..., [id1, ...]]
  const params: (string | string[] | number)[] = [
    ...spaces.flatMap(({ id, turbo_expiration }) => [id, turbo_expiration]),
    ...spaces.flatMap(({ id, credits }) => [id, credits])
  ];

  // Append `id`s again for the `WHERE IN (...)` clause
  params.push(spaces.map(space => space.id));

  await db.queryAsync(query, params);
}

async function getSpacesExpirationDates(): Promise<Space[]> {
  const query = `
    query GetSpaces {
      _metadatas(where: { id: "last_indexed_block" }) {
        indexer
        value
      }
      spaces(first: ${MAX_SPACES}) {
        id
        turbo_expiration
        credits
      }
    }
  `;

  try {
    const response = await fetchWithKeepAlive(SCHNAPS_API_URL, {
      timeout: 5e3,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.errors) {
      capture(
        new Error(`schnaps-api: ${data.errors.map(e => e.message).join('; ')}`),
        { extra: { errors: data.errors } }
      );
      return [];
    }

    // Credits add up across chains, so every indexer must be up to date
    for (const [indexer, { chainId, maxLag }] of Object.entries(EVM_INDEXERS)) {
      const metadata = data.data._metadatas.find(m => m.indexer === indexer);
      if (!metadata) {
        console.log(
          `Schnaps last_indexed_block missing for indexer "${indexer}". Skipping update.`
        );
        return [];
      }

      const block = await (getProvider(chainId) as EvmProvider).getBlock(
        'latest'
      );
      if (block.number - Number(metadata.value) > maxLag) {
        console.log(
          `Schnaps API is outdated for "${indexer}". Skipping update.`
        );
        return [];
      }
    }

    if (data.data.spaces.length === MAX_SPACES) {
      capture(new Error('schnaps-api: spaces list truncated, add pagination'));
    }

    return data.data.spaces;
  } catch (err) {
    capture(err);
    return [];
  }
}
