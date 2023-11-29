import fetch from 'node-fetch';
import { CallData, Contract, Provider, hash, shortString } from 'starknet';
import { Contract as EthContract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import { faker } from '@faker-js/faker';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { utils } from '@snapshot-labs/sx';
import {
  Space,
  StrategiesParsedMetadataItem,
  VotingPowerValidationStrategiesParsedMetadataItem
} from '../.checkpoint/models';
import EncodersAbi from './abis/encoders.json';
import ExecutionStrategyAbi from './abis/executionStrategy.json';
import SimpleQuorumExecutionStrategyAbi from './abis/l1/SimpleQuorumExecutionStrategy.json';
import { networkNodeUrl, networkProperties } from './overrrides';
import { handleStrategiesParsedMetadata } from './ipfs';

const ethProvider = new JsonRpcProvider(
  process.env.L1_NETWORK_NODE_URL ?? 'https://rpc.brovider.xyz/5'
);
const starkProvider = new Provider({
  rpc: {
    nodeUrl: networkNodeUrl
  }
});

const encodersAbi = new CallData(EncodersAbi);

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
    if (address === '0x0') return null;

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

export async function updateProposaValidationStrategy(
  space: Space,
  validationStrategyAddress: string,
  validationStrategyParams: string[],
  metadataUri: string[]
) {
  space.validation_strategy = validationStrategyAddress;
  space.validation_strategy_params = validationStrategyParams.join(',');
  space.voting_power_validation_strategy_strategies = [];
  space.voting_power_validation_strategy_strategies_params = [];
  space.voting_power_validation_strategy_metadata = longStringToText(metadataUri);

  if (
    utils.encoding.hexPadLeft(validationStrategyAddress) ===
    utils.encoding.hexPadLeft(networkProperties.propositionPowerValidationStrategyAddress)
  ) {
    const parsed = encodersAbi.parse(
      'proposition_power_params',
      validationStrategyParams
    ) as Record<string, any>;

    if (Object.keys(parsed).length !== 0) {
      space.proposal_threshold = parsed.proposal_threshold;
      space.voting_power_validation_strategy_strategies = parsed.allowed_strategies.map(
        strategy => `0x${strategy.address.toString(16)}`
      );
      space.voting_power_validation_strategy_strategies_params = parsed.allowed_strategies.map(
        strategy => strategy.params.map(param => `0x${param.toString(16)}`).join(',')
      );
    }

    try {
      await handleVotingPowerValidationMetadata(
        space.id,
        space.voting_power_validation_strategy_metadata
      );
    } catch (e) {
      console.log('failed to handle voting power strategies metadata', e);
    }
  }
}

export async function handleStrategiesMetadata(
  spaceId: string,
  metadataUris: string[],
  startingIndex: number,
  type:
    | typeof StrategiesParsedMetadataItem
    | typeof VotingPowerValidationStrategiesParsedMetadataItem = StrategiesParsedMetadataItem
) {
  for (let i = 0; i < metadataUris.length; i++) {
    const metadataUri = metadataUris[i];

    const index = startingIndex + i;
    const uniqueId = `${spaceId}/${index}/${dropIpfs(metadataUri)}`;

    const exists = await type.loadEntity(uniqueId);
    if (exists) continue;

    const strategiesParsedMetadataItem = new type(uniqueId);
    strategiesParsedMetadataItem.space = spaceId;
    strategiesParsedMetadataItem.index = index;

    if (metadataUri.startsWith('ipfs://')) {
      strategiesParsedMetadataItem.data = dropIpfs(metadataUri);

      await handleStrategiesParsedMetadata(metadataUri);
    }

    await strategiesParsedMetadataItem.save();
  }
}

export async function handleVotingPowerValidationMetadata(spaceId: string, metadataUri: string) {
  if (!metadataUri) return;

  const metadata: any = await getJSON(metadataUri);
  if (!metadata.strategies_metadata) return;

  await handleStrategiesMetadata(
    spaceId,
    metadata.strategies_metadata,
    0,
    VotingPowerValidationStrategiesParsedMetadataItem
  );
}
