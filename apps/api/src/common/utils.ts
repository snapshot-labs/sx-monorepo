import { faker } from '@faker-js/faker';
import { getExecutionData, utils } from '@snapshot-labs/sx';
import { poseidonHashMany } from 'micro-starknet';
import { hash } from 'starknet';
import { keccak256 } from 'viem';
import { Network, Proposal, ScoresTick } from '../../.checkpoint/models';
import { UI_URL } from '../config';

type ExecutionType = Parameters<typeof getExecutionData>[0];

export function getSpaceLink({
  networkId,
  spaceId
}: {
  networkId: string;
  spaceId: string;
}) {
  return `${UI_URL}/#/${networkId}:${spaceId}`;
}

export function getProposalLink({
  networkId,
  spaceId,
  proposalId
}: {
  networkId: string;
  spaceId: string;
  proposalId: number | string | bigint;
}) {
  const spaceLink = getSpaceLink({ networkId, spaceId });

  return `${spaceLink}/proposal/${proposalId}`;
}

export async function updateCounter(
  indexerName: string,
  value: 'space_count' | 'proposal_count' | 'vote_count',
  increment: number
) {
  let counter = await Network.loadEntity(indexerName, indexerName);
  if (!counter) {
    counter = new Network(indexerName, indexerName);
  }

  counter[value] = counter[value] + increment;

  await counter.save();
}

function getUrl(uri: string, gateway = 'pineapple.fyi') {
  const ipfsGateway = `https://${gateway}`;
  if (!uri) return null;
  if (
    !uri.startsWith('ipfs://') &&
    !uri.startsWith('ipns://') &&
    !uri.startsWith('https://') &&
    !uri.startsWith('http://')
  ) {
    return `${ipfsGateway}/ipfs/${uri}`;
  }
  const uriScheme = uri.split('://')[0];
  if (uriScheme === 'ipfs') {
    return uri.replace('ipfs://', `${ipfsGateway}/ipfs/`);
  }
  if (uriScheme === 'ipns') {
    return uri.replace('ipns://', `${ipfsGateway}/ipns/`);
  }
  return uri;
}

export function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function dropIpfs(metadataUri: string) {
  return metadataUri.replace('ipfs://', '');
}

export function getSpaceName(address: string) {
  const seed = parseInt(
    hash.getSelectorFromName(address).toString().slice(0, 12)
  );
  faker.seed(seed);
  const noun = faker.word.noun(6);
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} DAO`;
}

const FETCH_TIMEOUT = 15000;
const FETCH_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 500;
const MAX_RETRY_DELAY = 5000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelay(attempt: number) {
  return Math.min(BASE_RETRY_DELAY * 2 ** attempt, MAX_RETRY_DELAY);
}

/**
 * A gateway that rate limits us or fails on its own side will usually serve the
 * same content a moment later. Any other status is an answer about the content
 * itself and will read the same however many times we ask.
 */
function isRetriableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * A metadata fetch that fails here leaves the entity it belongs to with a null
 * pointer, and nothing revisits it afterwards, so a gateway blip is permanent
 * data loss. Transient failures are retried; a definite answer is not.
 */
export async function getJSON(uri: string) {
  const url = getUrl(uri);
  if (!url) throw new Error('Invalid URI');

  for (let attempt = 0; ; attempt++) {
    const lastAttempt = attempt === FETCH_ATTEMPTS - 1;

    let res: Response;
    try {
      res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT)
      });
    } catch (err) {
      // The gateway was unreachable, or took longer than we waited.
      if (lastAttempt) throw err;

      await sleep(getRetryDelay(attempt));
      continue;
    }

    if (!res.ok) {
      if (lastAttempt || !isRetriableStatus(res.status)) {
        throw new Error(`Failed to fetch JSON from ${url}: ${res.statusText}`);
      }

      await sleep(getRetryDelay(attempt));
      continue;
    }

    return res.json();
  }
}

export function getExecutionHash({
  type,
  executionType,
  executionDestination,
  transactions
}: {
  type: 'starknet' | 'evm';
  executionType: string;
  executionDestination: string | null;
  transactions: utils.encoding.MetaTransaction[];
}) {
  const data = getExecutionData(
    executionType as ExecutionType,
    '0x0000000000000000000000000000000000000000',
    {
      transactions: transactions.map(tx => ({
        ...tx,
        operation: 0,
        salt: BigInt(tx.salt)
      })),
      destination: executionDestination ?? undefined
    }
  );

  if (type === 'evm') {
    if (!data.executionParams[0]) {
      return null;
    }

    return keccak256(data.executionParams[0] as `0x${string}`);
  }

  return `0x${poseidonHashMany(data.executionParams.map(v => BigInt(v))).toString(16)}`;
}

export function getSpaceDecimals(decimals: number[]) {
  if (decimals.length === 0) return 0;

  return Math.max(...decimals);
}

export function getParsedVP(value: string, decimals: number) {
  const parsedValue = parseInt(value, 10);

  return parsedValue / 10 ** decimals;
}

export async function updateScoresTick(
  proposal: Proposal,
  timestamp: number,
  indexerName: string
): Promise<void> {
  const hourTimestamp = Math.floor(timestamp / 3600) * 3600;
  const tickId = `${proposal.id}/${hourTimestamp}`;

  let tick = await ScoresTick.loadEntity(tickId, indexerName);

  if (!tick) {
    tick = new ScoresTick(tickId, indexerName);
    tick.proposal = proposal.id;
  }

  tick.timestamp = hourTimestamp;
  tick.scores_1 = proposal.scores_1;
  tick.scores_2 = proposal.scores_2;
  tick.scores_3 = proposal.scores_3;

  await tick.save();
}
