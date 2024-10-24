import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract as EthContract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import { faker } from '@faker-js/faker';
import { utils } from '@snapshot-labs/sx';
import fetch from 'cross-fetch';
import {
  BigNumberish,
  CallData,
  Contract,
  hash,
  RpcProvider,
  shortString,
  validateAndParseAddress
} from 'starknet';
import EncodersAbi from './abis/encoders.json';
import ExecutionStrategyAbi from './abis/executionStrategy.json';
import SimpleQuorumExecutionStrategyAbi from './abis/l1/SimpleQuorumExecutionStrategy.json';
import { handleStrategiesParsedMetadata } from './ipfs';
import { networkNodeUrl, networkProperties } from './overrrides';
import {
  Space,
  StrategiesParsedMetadataItem,
  VotingPowerValidationStrategiesParsedMetadataItem
} from '../.checkpoint/models';

type StrategyConfig = {
  address: BigNumberish;
  params: BigNumberish[];
};

export const ethProvider = new JsonRpcProvider(
  process.env.L1_NETWORK_NODE_URL ??
    `https://rpc.brovider.xyz/${networkProperties.baseChainId}`
);
const starkProvider = new RpcProvider({
  nodeUrl: networkNodeUrl
});

const encodersAbi = new CallData(EncodersAbi);

export function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function toAddress(bn: any) {
  try {
    return getAddress(BigNumber.from(bn).toHexString());
  } catch (e) {
    return bn;
  }
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

export async function getJSON(uri: string) {
  const url = getUrl(uri);
  if (!url) throw new Error('Invalid URI');

  return fetch(url).then(res => res.json());
}

export function getSpaceName(address: string) {
  const seed = parseInt(
    hash.getSelectorFromName(address).toString().slice(0, 12)
  );
  faker.seed(seed);
  const noun = faker.word.noun(6);
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} DAO`;
}

export function dropIpfs(metadataUri: string) {
  return metadataUri.replace('ipfs://', '');
}

export function longStringToText(array: string[]): string {
  return array.reduce(
    (acc, slice) => acc + shortString.decodeShortString(slice),
    ''
  );
}

export function findVariant(value: { variant: Record<string, any> }) {
  const result = Object.entries(value.variant).find(
    ([, v]) => typeof v !== 'undefined'
  );
  if (!result) throw new Error('Invalid variant');

  return {
    key: result[0],
    value: result[1]
  };
}

function formatAddress(type: string, address: string) {
  if (type === 'Starknet') {
    return validateAndParseAddress(address);
  }

  if (type === 'Ethereum') {
    const paddedAddress = `0x${address.replace('0x', '').padStart(40, '0')}`;
    return getAddress(paddedAddress);
  }

  return address;
}

export function formatAddressVariant({
  key,
  value
}: {
  key: string;
  value: string;
}) {
  return {
    type: key === 'Starknet' ? 0 : key === 'Ethereum' ? 1 : 2,
    address: formatAddress(key, value)
  };
}

export function getVoteValue(label: string) {
  if (label === 'Against') return 2;
  if (label === 'For') return 1;
  if (label === 'Abstain') return 3;

  throw new Error('Invalid vote label');
}

export async function handleExecutionStrategy(
  address: string,
  payload: string[]
) {
  try {
    if (address === '0x0') return null;

    const executionContract = new Contract(
      ExecutionStrategyAbi,
      address,
      starkProvider
    );

    const executionStrategyType = shortString.decodeShortString(
      await executionContract.get_strategy_type()
    );

    let quorum = 0n;
    let destinationAddress = null;
    if (executionStrategyType === 'SimpleQuorumVanilla') {
      quorum = await executionContract.quorum();
    } else if (executionStrategyType === 'EthRelayer') {
      const [l1Destination] = payload;
      if (!l1Destination)
        throw new Error('Invalid payload for EthRelayer execution strategy');
      destinationAddress = formatAddress('Ethereum', l1Destination);

      const SimpleQuorumExecutionStrategyContract = new EthContract(
        destinationAddress,
        SimpleQuorumExecutionStrategyAbi,
        ethProvider
      );

      quorum = (
        await SimpleQuorumExecutionStrategyContract.quorum()
      ).toBigInt();
    }

    return {
      executionStrategyType,
      destinationAddress,
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
  space.voting_power_validation_strategy_metadata =
    longStringToText(metadataUri);

  if (
    utils.encoding.hexPadLeft(validationStrategyAddress) ===
    utils.encoding.hexPadLeft(
      networkProperties.propositionPowerValidationStrategyAddress
    )
  ) {
    const parsed = encodersAbi.parse(
      'proposition_power_params',
      validationStrategyParams
    ) as Record<string, any>;

    if (Object.keys(parsed).length !== 0) {
      space.proposal_threshold = parsed.proposal_threshold.toString(10);
      space.voting_power_validation_strategy_strategies =
        parsed.allowed_strategies.map(
          (strategy: StrategyConfig) => `0x${strategy.address.toString(16)}`
        );
      space.voting_power_validation_strategy_strategies_params =
        parsed.allowed_strategies.map((strategy: StrategyConfig) =>
          strategy.params.map(param => `0x${param.toString(16)}`).join(',')
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
    if (!metadataUri) continue;

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

export async function handleVotingPowerValidationMetadata(
  spaceId: string,
  metadataUri: string
) {
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

export async function registerProposal({
  l1TokenAddress,
  strategyAddress,
  snapshotTimestamp
}: {
  l1TokenAddress: string;
  strategyAddress: string;
  snapshotTimestamp: number;
}) {
  const res = await fetch(networkProperties.manaRpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      method: 'registerProposal',
      params: {
        l1TokenAddress,
        strategyAddress,
        snapshotTimestamp
      }
    })
  });

  return res.json();
}
