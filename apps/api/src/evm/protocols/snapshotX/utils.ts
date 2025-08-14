import { defaultAbiCoder } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import IExecutionStrategy from './abis/IExecutionStrategy.json';
import { ExecutionStrategy, Space } from '../../../../.checkpoint/models';
import { handleVotingPowerValidationMetadata } from '../../../common/ipfs';
import { EVMConfig, SnapshotXConfig } from '../../types';

/**
 * Convert EVM onchain choice value to common format.
 * EVM uses 0 for Against, 1 for For, 2 for Abstain.
 * Common format uses 1 for For, 2 for Against, 3 for Abstain.
 * @param rawChoice onchain choice value
 * @returns common format choice value or null if unknown
 */
export function convertChoice(rawChoice: number): 1 | 2 | 3 | null {
  if (rawChoice === 0) return 2;
  if (rawChoice === 1) return 1;
  if (rawChoice === 2) return 3;

  return null;
}

export async function updateProposalValidationStrategy(
  space: Space,
  validationStrategyAddress: string,
  validationStrategyParams: string,
  metadataUri: string,
  config: EVMConfig,
  protocolConfig: SnapshotXConfig
) {
  const strategyAddress = getAddress(validationStrategyAddress);

  space.validation_strategy = strategyAddress;
  space.validation_strategy_params = validationStrategyParams;
  space.voting_power_validation_strategy_strategies = [];
  space.voting_power_validation_strategy_strategies_params = [];
  space.voting_power_validation_strategy_metadata = metadataUri;

  if (
    strategyAddress ===
    getAddress(protocolConfig.propositionPowerValidationStrategyAddress)
  ) {
    try {
      const decoded = defaultAbiCoder.decode(
        ['uint256', 'tuple(address,bytes)[]'],
        validationStrategyParams
      ) as [BigNumber, [string, string][]];

      space.proposal_threshold = decoded[0].toString();
      space.voting_power_validation_strategy_strategies = decoded[1].map(
        ([strategyAddress]) => getAddress(strategyAddress)
      );
      space.voting_power_validation_strategy_strategies_params = decoded[1].map(
        ([, params]) => params
      );

      try {
        await handleVotingPowerValidationMetadata(
          space.id,
          space.voting_power_validation_strategy_metadata,
          config
        );
      } catch (e) {
        console.log('failed to handle voting power strategies metadata', e);
      }
    } catch {
      space.proposal_threshold = '0';
      space.voting_power_validation_strategy_strategies = [];
      space.voting_power_validation_strategy_strategies_params = [];
    }
  }
}

export async function handleCustomExecutionStrategy(
  address: string,
  blockNumber: number,
  provider: JsonRpcProvider,
  config: EVMConfig,
  protocolConfig: SnapshotXConfig
) {
  const contract = new Contract(address, IExecutionStrategy, provider);

  const overrides = {
    blockTag: blockNumber
  };

  const type = await contract.getStrategyType(overrides);

  let executionStrategy = await ExecutionStrategy.loadEntity(
    address,
    config.indexerName
  );

  if (executionStrategy) return;

  executionStrategy = new ExecutionStrategy(address, config.indexerName);
  executionStrategy.address = address;
  executionStrategy.type = type;
  executionStrategy.quorum = '0';
  executionStrategy.treasury_chain = protocolConfig.chainId;
  executionStrategy.treasury = getAddress(address);
  executionStrategy.timelock_delay = 0n;

  await executionStrategy.save();
}

export async function registerApeGasProposal(
  {
    viewId,
    snapshot
  }: {
    viewId: string;
    snapshot: number;
  },
  protocolConfig: SnapshotXConfig
) {
  const res = await fetch(protocolConfig.manaRpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      method: 'registerApeGasProposal',
      params: {
        viewId,
        snapshot
      }
    })
  });

  if (!res.ok) {
    throw new Error(
      `Failed to register ApeGas proposal: ${res.status} ${res.statusText}`
    );
  }

  const result = await res.json();
  if (result.error) {
    throw new Error(`Failed to register ApeGas proposal: ${result.error}`);
  }

  return result;
}
