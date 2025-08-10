import { keccak256 } from '@ethersproject/keccak256';
import { faker } from '@faker-js/faker';
import { getExecutionData, utils } from '@snapshot-labs/sx';
import { poseidonHashMany } from 'micro-starknet';
import { hash } from 'starknet';
import { Network } from '../../.checkpoint/models';
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
  proposalId: number;
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

export function getUrl(uri: string, gateway = 'pineapple.fyi') {
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

    return keccak256(data.executionParams[0]);
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
