import { RpcProvider } from 'starknet';
import logger from './logger';

/**
 * Maximum acceptable lag (chain head - last indexed block) before an indexer is
 * considered unhealthy. Can be overridden via the HEALTH_MAX_LAG env variable.
 */
const DEFAULT_MAX_LAG = 100;

const MAX_LAG = process.env.HEALTH_MAX_LAG
  ? parseInt(process.env.HEALTH_MAX_LAG)
  : DEFAULT_MAX_LAG;

/**
 * How long a chain-head lookup is allowed to take before it is treated as
 * failed. Keeps the health endpoint responsive even when an RPC is down.
 */
const HEAD_FETCH_TIMEOUT = 10000;

const Table = {
  Metadata: '_metadatas'
};

const Fields = {
  Metadata: {
    Id: 'id',
    Indexer: 'indexer',
    Value: 'value'
  }
};

const LAST_INDEXED_BLOCK = 'last_indexed_block';

/**
 * A function returning the current chain head (latest block number) for a
 * given indexer's network.
 */
type HeadFetcher = () => Promise<number>;

export type IndexerHealth = {
  indexer: string;
  indexedBlock: number | null;
  chainHead: number | null;
  lag: number | null;
  healthy: boolean;
  error?: string;
};

export type HealthReport = {
  healthy: boolean;
  maxLag: number;
  indexers: IndexerHealth[];
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )
  ]);
}

/**
 * Builds the map of head fetchers for the Starknet indexers, which are the ones
 * tracked by the indexer-lag alerting. EVM networks can be added here later.
 */
export function createStarknetHeadFetchers(
  configs: { indexerName: string; network_node_url: string }[]
): Record<string, HeadFetcher> {
  const fetchers: Record<string, HeadFetcher> = {};

  for (const config of configs) {
    const provider = new RpcProvider({ nodeUrl: config.network_node_url });
    fetchers[config.indexerName] = () => provider.getBlockNumber();
  }

  return fetchers;
}

/**
 * Reads the last indexed block for every indexer from the checkpoint metadata
 * table, compares it against the current chain head, and reports the lag.
 *
 * This is the data Betterstack (or any uptime monitor) can poll: a frozen
 * indexer head shows up as growing lag even while the API process is up.
 */
type MetadataRow = { indexer: string; value: string };

/**
 * Reads the last-indexed-block rows from the checkpoint metadata table.
 * Provided by the caller so this module stays decoupled from the knex type.
 */
export type LastIndexedBlockReader = () => Promise<MetadataRow[]>;

export function createKnexLastIndexedBlockReader(knex: {
  (table: string): {
    select: (...columns: string[]) => {
      where: (filter: Record<string, unknown>) => Promise<MetadataRow[]>;
    };
  };
}): LastIndexedBlockReader {
  return () =>
    knex(Table.Metadata)
      .select(Fields.Metadata.Indexer, Fields.Metadata.Value)
      .where({ [Fields.Metadata.Id]: LAST_INDEXED_BLOCK });
}

export async function getHealthReport(
  readLastIndexedBlocks: LastIndexedBlockReader,
  headFetchers: Record<string, HeadFetcher>
): Promise<HealthReport> {
  const rows = await readLastIndexedBlocks();

  const indexedByName = new Map<string, number>();
  for (const row of rows) {
    indexedByName.set(row.indexer, parseInt(row.value));
  }

  // Report on every indexer we have a head fetcher for (i.e. is monitored),
  // even if it has not written a last_indexed_block row yet.
  const indexerNames = new Set([
    ...Object.keys(headFetchers),
    ...indexedByName.keys()
  ]);

  const indexers: IndexerHealth[] = await Promise.all(
    [...indexerNames].map(async indexer => {
      const indexedBlock = indexedByName.get(indexer) ?? null;
      const fetcher = headFetchers[indexer];

      if (!fetcher) {
        // Not monitored for lag (no head fetcher); report block only.
        return {
          indexer,
          indexedBlock,
          chainHead: null,
          lag: null,
          healthy: true
        };
      }

      try {
        const chainHead = await withTimeout(fetcher(), HEAD_FETCH_TIMEOUT);
        const lag =
          indexedBlock === null ? chainHead : chainHead - indexedBlock;

        return {
          indexer,
          indexedBlock,
          chainHead,
          lag,
          healthy: lag <= MAX_LAG
        };
      } catch (err) {
        logger.warn({ err, indexer }, 'failed to fetch chain head for health');

        return {
          indexer,
          indexedBlock,
          chainHead: null,
          lag: null,
          healthy: false,
          error: 'failed to fetch chain head'
        };
      }
    })
  );

  return {
    healthy: indexers.every(indexer => indexer.healthy),
    maxLag: MAX_LAG,
    indexers
  };
}
