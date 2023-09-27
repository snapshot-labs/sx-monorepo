import fetch from 'node-fetch';
import { Contract, Provider, hash, shortString } from 'starknet';
import { Contract as EthContract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import { faker } from '@faker-js/faker';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { StrategiesParsedMetadataItem } from '../.checkpoint/models';
import ExecutionStrategyAbi from './abis/executionStrategy.json';
import SimpleQuorumExecutionStrategyAbi from './abis/l1/SimpleQuorumExecutionStrategy.json';
import Config from './config.json';
import { handleStrategiesParsedMetadata } from './ipfs';

const ethProvider = new JsonRpcProvider(
  process.env.L1_NETWORK_NODE_URL ?? 'https://rpc.brovider.xyz/5'
);
const starkProvider = new Provider({
  rpc: {
    nodeUrl: Config.network_node_url
  }
});

export function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function toAddress(bn) {
  try {
    return getAddress(BigNumber.from(bn).toHexString());
  } catch (e) {
    return bn;
  }
}

export function getUrl(uri, gateway = 'pineapple.fyi') {
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
  if (uriScheme === 'ipfs') return uri.replace('ipfs://', `${ipfsGateway}/ipfs/`);
  if (uriScheme === 'ipns') return uri.replace('ipns://', `${ipfsGateway}/ipns/`);
  return uri;
}

export async function getJSON(uri) {
  const url = getUrl(uri);
  return fetch(url).then(res => res.json());
}

export function getSpaceName(address) {
  const seed = parseInt(hash.getSelectorFromName(address).toString().slice(0, 12));
  faker.seed(seed);
  const noun = faker.word.noun(6);
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} DAO`;
}

export function dropIpfs(metadataUri: string) {
  return metadataUri.replace('ipfs://', '');
}

export function longStringToText(array: string[]): string {
  return array.reduce((acc, slice) => acc + shortString.decodeShortString(slice), '');
}

export function findVariant(value: { variant: Record<string, any> }) {
  const result = Object.entries(value.variant).find(([, v]) => typeof v !== 'undefined');
  if (!result) throw new Error('Invalid variant');

  return {
    key: result[0],
    value: result[1]
  };
}

export function getVoteValue(label: string) {
  if (label === 'Against') return 0;
  if (label === 'For') return 1;
  if (label === 'Abstain') return 2;

  throw new Error('Invalid vote label');
}

export async function handleExecutionStrategy(address: string, payload: string[]) {
  try {
    const executionContract = new Contract(ExecutionStrategyAbi, address, starkProvider);

    const executionStrategyType = shortString.decodeShortString(
      await executionContract.get_strategy_type()
    );

    let quorum = 0n;
    if (executionStrategyType === 'SimpleQuorumVanilla') {
      quorum = await executionContract.quorum();
    } else if (executionStrategyType === 'EthRelayer') {
      const [l1Destination] = payload;

      const SimpleQuorumExecutionStrategyContract = new EthContract(
        l1Destination,
        SimpleQuorumExecutionStrategyAbi,
        ethProvider
      );

      quorum = (await SimpleQuorumExecutionStrategyContract.quorum()).toBigInt();
    }

    return {
      executionStrategyType,
      quorum
    };
  } catch (e) {
    console.log('failed to get execution strategy type', e);

    return null;
  }
}

export async function handleStrategiesMetadata(spaceId: string, metadataUris: string[]) {
  for (let i = 0; i < metadataUris.length; i++) {
    const metadataUri = metadataUris[i];

    const exists = await StrategiesParsedMetadataItem.loadEntity(dropIpfs(metadataUri));
    if (exists) continue;

    const strategiesParsedMetadataItem = new StrategiesParsedMetadataItem(dropIpfs(metadataUri));
    strategiesParsedMetadataItem.space = spaceId;
    strategiesParsedMetadataItem.index = i;

    if (metadataUri.startsWith('ipfs://')) {
      strategiesParsedMetadataItem.data = dropIpfs(metadataUri);

      await handleStrategiesParsedMetadata(metadataUri);
    }

    await strategiesParsedMetadataItem.save();
  }
}
