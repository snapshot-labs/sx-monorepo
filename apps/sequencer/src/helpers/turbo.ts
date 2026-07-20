import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import db from './mysql';
import { getProvider } from './provider';
import { fetchWithKeepAlive } from './utils';

type Space = {
  id: string;
  turbo_expiration: number;
};

const SCHNAPS_API_URL = process.env.SCHNAPS_API_URL;
const NETWORK_PREFIX = process.env.NETWORK === 'mainnet' ? 's:' : 's-tn:';
const EVM_INDEXER = process.env.NETWORK === 'mainnet' ? 'eth' : 'sep';
const RUN_INTERVAL = 10 * 1e3; // 10 seconds

const provider = getProvider(process.env.DEFAULT_NETWORK ?? '1');

// Periodically sync the turbo status of spaces with the schnaps-api
export async function trackTurboStatuses() {
  if (!SCHNAPS_API_URL) return;

  while (true) {
    // Step 1: Query all the spaces from the schnaps-api
    let spaces = await getSpacesExpirationDates();

    spaces = spaces
      .filter(space => space.id.startsWith(NETWORK_PREFIX))
      .map(space => {
        return { ...space, id: space.id.replace(NETWORK_PREFIX, '') };
      });

    // Step 2: Update the turbo status of the spaces in the database
    updateTurboStatuses(spaces);

    // Sleep for a while before running the loop again
    await snapshot.utils.sleep(RUN_INTERVAL);
  }
}

async function updateTurboStatuses(
  spaces: { id: string; turbo_expiration: number }[]
) {
  if (spaces.length === 0) return;

  // Sync `turbo_expiration` for each space
  const query = `
    UPDATE spaces
    SET
      turbo_expiration = CASE id
        ${spaces.map(() => `WHEN ? THEN ?`).join(' ')}
      END
    WHERE id IN (?);
  `;

  // Flatten `spaces` array: [id1, expiration1, id2, expiration2, ..., now, id1, id2, ...]
  const params: (string | string[] | number)[] = spaces.flatMap(
    ({ id, turbo_expiration }) => [id, turbo_expiration]
  );

  // Append `id`s again for the `WHERE IN (...)` clause
  params.push(spaces.map(space => space.id));

  await db.query(query, params);
}

// TODO: adds pagination to handle large number of spaces
async function getSpacesExpirationDates(): Promise<Space[]> {
  const query = `
    query GetSpaces {
      _metadata(id: "last_indexed_block", indexer: "${EVM_INDEXER}") {
        id
        value
      }
      spaces {
        id
        turbo_expiration
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
      capture(data);
      return [];
    }

    if (!data.data._metadata) {
      console.log(
        `Schnaps last_indexed_block missing for indexer "${EVM_INDEXER}". Skipping update.`
      );
      return [];
    }

    const block = await provider.getBlock('latest');
    if (block.number - Number(data.data._metadata.value) > 10) {
      console.log('Schnaps API is outdated. Skipping update.');
      return [];
    }

    return data.data.spaces;
  } catch (err) {
    capture(err);
    return [];
  }
}
