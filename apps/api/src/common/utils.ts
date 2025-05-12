import { keccak256 } from '@ethersproject/keccak256';
import { faker } from '@faker-js/faker';
import { getExecutionData } from '@snapshot-labs/sx';
import { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding';
import fetch from 'cross-fetch';
import { hash } from 'starknet';
import { Network } from '../../.checkpoint/models';

type ExecutionType = Parameters<typeof getExecutionData>[0];

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

  return fetch(url).then(res => res.json());
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
  transactions: MetaTransaction[];
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

  return hash.computeHashOnElements(data.executionParams);
}
