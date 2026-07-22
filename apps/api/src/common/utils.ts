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
  )
    return `${ipfsGateway}/ipfs/${uri}`;
  const uriScheme = uri.split('://')[0];
  if (uriScheme === 'ipfs')
    return uri.replace('ipfs://', `${ipfsGateway}/ipfs/`);
  if (uriScheme === 'ipns')
    return uri.replace('ipns://', `${ipfsGateway}/ipns/`);
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

export async function getJSON(uri: string) {
  const url = getUrl(uri);
  if (!url) throw new Error('Invalid URI');

  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch JSON from ${url}: ${res.statusText}`);
  }

  return res.json();
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

export function updateProposalScores(
  proposal: Proposal,
  choice: number,
  vp: bigint
) {
  const scores = [...proposal.scores];
  const scoresParsed = [...proposal.scores_parsed];

  while (scores.length < choice) {
    scores.push('0');
    scoresParsed.push(0);
  }

  const updatedScore = (BigInt(scores[choice - 1] ?? '0') + vp).toString();
  const updatedScoreParsed = getParsedVP(updatedScore, proposal.vp_decimals);
  scores[choice - 1] = updatedScore;
  scoresParsed[choice - 1] = updatedScoreParsed;

  proposal.scores = scores;
  proposal.scores_parsed = scoresParsed;

  if (choice === 1 || choice === 2 || choice === 3) {
    proposal[`scores_${choice}`] = updatedScore;
    proposal[`scores_${choice}_parsed`] = updatedScoreParsed;
  }

  proposal.scores_total = (BigInt(proposal.scores_total) + vp).toString();
  proposal.scores_total_parsed = getParsedVP(
    proposal.scores_total,
    proposal.vp_decimals
  );
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
  tick.scores = proposal.scores;
  tick.scores_1 = proposal.scores_1;
  tick.scores_2 = proposal.scores_2;
  tick.scores_3 = proposal.scores_3;

  await tick.save();
}
