import {
  createPublicClient,
  http,
  type PublicClient,
  type Address
} from 'viem';
import { config } from './config.js';
import { snackMarketAbi } from './abis.js';
import { resolveMarket } from './resolver.js';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

interface TrackedMarket {
  address: Address;
  referenceUri: string;
  resolved: boolean;
}

const trackedMarkets: Map<string, TrackedMarket> = new Map();

function parseReferenceUri(uri: string): {
  network: string;
  space: string;
  proposalId: string;
} | null {
  // snapshot://s:aave.eth/proposal/0x123...
  // snapshot://eth:0x1356..2454/proposal/123
  const match = uri.match(
    /^snapshot:\/\/([^:]+):([^/]+)\/proposal\/(.+)$/
  );
  if (!match) return null;
  return {
    network: match[1] as string,
    space: match[2] as string,
    proposalId: match[3] as string
  };
}

async function fetchProposalState(
  proposalId: string
): Promise<{ state: string } | null> {
  try {
    const res = await fetch(config.snapshotApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query ($id: String!) {
          proposal(id: $id) {
            id
            state
          }
        }`,
        variables: { id: proposalId }
      })
    });

    const json = (await res.json()) as {
      data?: { proposal?: { state: string } };
    };
    return json.data?.proposal ?? null;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch proposal state');
    return null;
  }
}

async function syncMarkets(client: PublicClient) {
  const logs = await client.getLogs({
    address: config.factoryAddress,
    event: {
      type: 'event',
      name: 'MarketCreated',
      inputs: [
        { name: 'referenceId', type: 'bytes32', indexed: true },
        { name: 'referenceUri', type: 'string', indexed: false },
        { name: 'market', type: 'address', indexed: false }
      ]
    },
    fromBlock: 0n
  });

  for (const log of logs) {
    const refUri = log.args.referenceUri!;
    if (!trackedMarkets.has(refUri)) {
      trackedMarkets.set(refUri, {
        address: log.args.market!,
        referenceUri: refUri,
        resolved: false
      });
      logger.info({ refUri, market: log.args.market }, 'Tracking new market');
    }
  }
}

async function checkAndResolve(client: PublicClient) {
  for (const [, market] of trackedMarkets) {
    if (market.resolved) continue;

    // Check if already resolved on-chain
    const isResolved = await client.readContract({
      address: market.address,
      abi: snackMarketAbi,
      functionName: 'resolved'
    });

    if (isResolved) {
      market.resolved = true;
      logger.info({ market: market.address }, 'Market already resolved');
      continue;
    }

    const parsed = parseReferenceUri(market.referenceUri);
    if (!parsed) {
      logger.warn(
        { uri: market.referenceUri },
        'Cannot parse reference URI'
      );
      continue;
    }

    const proposal = await fetchProposalState(parsed.proposalId);
    if (!proposal) continue;

    let winningOutcome: number | null = null;

    const state = proposal.state;
    if (
      state === 'closed' ||
      state === 'passed' ||
      state === 'executed' ||
      state === 'rejected'
    ) {
      // passed/executed/closed = YES wins, rejected = NO wins
      winningOutcome = state === 'rejected' ? 1 : 0;
    }

    if (winningOutcome !== null) {
      logger.info(
        {
          market: market.address,
          proposal: parsed.proposalId,
          state: proposal.state,
          outcome: winningOutcome === 0 ? 'YES' : 'NO'
        },
        'Resolving market'
      );

      try {
        await resolveMarket(market.address, winningOutcome);
        market.resolved = true;
        logger.info({ market: market.address }, 'Market resolved successfully');
      } catch (err) {
        logger.error({ err, market: market.address }, 'Failed to resolve');
      }
    }
  }
}

export async function startPolling() {
  const client = createPublicClient({
    transport: http(config.rpcUrl)
  });

  logger.info(
    {
      factory: config.factoryAddress,
      rpc: config.rpcUrl,
      interval: config.pollIntervalMs
    },
    'Starting oracle poller'
  );

  const poll = async () => {
    try {
      await syncMarkets(client);
      await checkAndResolve(client);
    } catch (err) {
      logger.error({ err }, 'Poll cycle error');
    }
  };

  // Initial poll
  await poll();

  // Recurring
  setInterval(poll, config.pollIntervalMs);
}
