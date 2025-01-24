import { defaultAbiCoder } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { FullConfig } from './config';
import { handleStrategiesParsedMetadata } from './ipfs';
import {
  Space,
  StrategiesParsedMetadataItem,
  VotingPowerValidationStrategiesParsedMetadataItem
} from '../../.checkpoint/models';
import { dropIpfs, getJSON } from '../utils';

/**
 * Convert EVM onchain choice value to common format.
 * EVM uses 0 for Against, 1 for For, 2 for Abstain.
 * Common format uses 1 for For, 2 for Against, 3 for Abstain.
 * @param rawChoice onchain choice value
 * @returns common format choice value or -1 if unknown
 */
export function convertChoice(rawChoice: number): 1 | 2 | 3 | null {
  if (rawChoice === 0) return 2;
  if (rawChoice === 1) return 1;
  if (rawChoice === 2) return 3;

  return null;
}

// TODO: unify?
export async function handleStrategiesMetadata(
  spaceId: string,
  metadataUris: string[],
  startingIndex: number,
  config: FullConfig,
  type:
    | typeof StrategiesParsedMetadataItem
    | typeof VotingPowerValidationStrategiesParsedMetadataItem = StrategiesParsedMetadataItem
) {
  for (let i = 0; i < metadataUris.length; i++) {
    const metadataUri = metadataUris[i];
    if (!metadataUri) continue;

    const index = startingIndex + i;
    const uniqueId = `${spaceId}/${index}/${dropIpfs(metadataUri)}`;

    const exists = await type.loadEntity(uniqueId, config.indexerName);
    if (exists) continue;

    const strategiesParsedMetadataItem = new type(uniqueId, config.indexerName);
    strategiesParsedMetadataItem.space = spaceId;
    strategiesParsedMetadataItem.index = index;

    if (metadataUri.startsWith('ipfs://')) {
      strategiesParsedMetadataItem.data = dropIpfs(metadataUri);

      await handleStrategiesParsedMetadata(metadataUri, config);
    }

    await strategiesParsedMetadataItem.save();
  }
}

export async function updateProposaValidationStrategy(
  space: Space,
  validationStrategyAddress: string,
  validationStrategyParams: string,
  metadataUri: string,
  config: FullConfig
) {
  const strategyAddress = getAddress(validationStrategyAddress);

  space.validation_strategy = strategyAddress;
  space.validation_strategy_params = validationStrategyParams;
  space.voting_power_validation_strategy_strategies = [];
  space.voting_power_validation_strategy_strategies_params = [];
  space.voting_power_validation_strategy_metadata = metadataUri;

  if (
    strategyAddress ===
    getAddress(config.overrides.propositionPowerValidationStrategyAddress)
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

export async function handleVotingPowerValidationMetadata(
  spaceId: string,
  metadataUri: string,
  config: FullConfig
) {
  if (!metadataUri) return;

  const metadata: any = await getJSON(metadataUri);
  if (!metadata.strategies_metadata) return;

  await handleStrategiesMetadata(
    spaceId,
    metadata.strategies_metadata,
    0,
    config,
    VotingPowerValidationStrategiesParsedMetadataItem
  );
}
