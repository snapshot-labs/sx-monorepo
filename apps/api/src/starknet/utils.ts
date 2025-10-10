import { utils } from '@snapshot-labs/sx';
import {
  BigNumberish,
  CallData,
  Contract,
  RpcProvider,
  shortString,
  validateAndParseAddress
} from 'starknet';
import { createPublicClient, getAddress, http } from 'viem';
import EncodersAbi from './abis/encoders.json';
import ExecutionStrategyAbi from './abis/executionStrategy.json';
import L1AvatarExecutionStrategyAbi from './abis/l1/L1AvatarExectionStrategy';
import { FullConfig } from './config';
import { Space } from '../../.checkpoint/models';
import { handleVotingPowerValidationMetadata } from '../common/ipfs';
import logger from '../logger';

type StrategyConfig = {
  address: BigNumberish;
  params: BigNumberish[];
};

const encodersAbi = new CallData(EncodersAbi);

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
  payload: string[],
  config: FullConfig
) {
  try {
    if (address === '0x0') return null;

    const starkProvider = new RpcProvider({
      nodeUrl: config.overrides.networkNodeUrl
    });

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

      const client = createPublicClient({
        transport: http(config.overrides.l1NetworkNodeUrl)
      });

      quorum = await client.readContract({
        address: destinationAddress as `0x${string}`,
        abi: L1AvatarExecutionStrategyAbi,
        functionName: 'quorum'
      });
    }

    return {
      executionStrategyType,
      destinationAddress,
      quorum
    };
  } catch (err) {
    logger.warn({ err }, 'Failed to get execution strategy type');

    return null;
  }
}

export async function updateProposalValidationStrategy(
  space: Space,
  validationStrategyAddress: string,
  validationStrategyParams: string[],
  metadataUri: string[],
  config: FullConfig
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
      config.overrides.propositionPowerValidationStrategyAddress
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
        space.voting_power_validation_strategy_metadata,
        config
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to handle voting power strategies metadata');
    }
  }
}

export async function registerProposal(
  {
    l1TokenAddress,
    strategyAddress,
    snapshotTimestamp
  }: {
    l1TokenAddress: string;
    strategyAddress: string;
    snapshotTimestamp: number;
  },
  config: FullConfig
) {
  const res = await fetch(config.overrides.manaRpcUrl, {
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
