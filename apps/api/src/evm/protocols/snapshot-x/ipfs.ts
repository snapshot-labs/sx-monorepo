import { getAddress } from 'viem';
import { SpaceMetadataItem } from '../../../../.checkpoint/models';
import { dropIpfs, getJSON, getSpaceName } from '../../../common/utils';
import { NetworkID } from '../../types';

export async function handleSpaceMetadata(
  space: string,
  metadataUri: string,
  indexerName: NetworkID
) {
  const exists = await SpaceMetadataItem.loadEntity(
    dropIpfs(metadataUri),
    indexerName
  );
  if (exists) return;

  const spaceMetadataItem = new SpaceMetadataItem(
    dropIpfs(metadataUri),
    indexerName
  );
  spaceMetadataItem.name = getSpaceName(space);
  spaceMetadataItem.about = '';
  spaceMetadataItem.avatar = '';
  spaceMetadataItem.cover = '';
  spaceMetadataItem.external_url = '';
  spaceMetadataItem.github = '';
  spaceMetadataItem.twitter = '';
  spaceMetadataItem.discord = '';
  spaceMetadataItem.farcaster = '';
  spaceMetadataItem.voting_power_symbol = '';
  spaceMetadataItem.wallet = '';
  spaceMetadataItem.executors = [];
  spaceMetadataItem.executors_strategies = [];
  spaceMetadataItem.executors_types = [];
  spaceMetadataItem.executors_destinations = [];
  spaceMetadataItem.treasuries = [];
  spaceMetadataItem.labels = [];
  spaceMetadataItem.delegations = [];

  const metadata: any = metadataUri ? await getJSON(metadataUri) : {};

  if (metadata.name) spaceMetadataItem.name = metadata.name;
  if (metadata.description) spaceMetadataItem.about = metadata.description;
  if (metadata.avatar) spaceMetadataItem.avatar = metadata.avatar;
  if (metadata.external_url)
    spaceMetadataItem.external_url = metadata.external_url;

  if (metadata.properties) {
    if (metadata.properties.cover)
      spaceMetadataItem.cover = metadata.properties.cover;

    if (metadata.properties.treasuries) {
      spaceMetadataItem.treasuries = metadata.properties.treasuries.map(
        (treasury: any) => JSON.stringify(treasury)
      );
    }
    if (metadata.properties.labels) {
      spaceMetadataItem.labels = metadata.properties.labels.map((label: any) =>
        JSON.stringify(label)
      );
    }
    if (metadata.properties.delegations) {
      spaceMetadataItem.delegations = metadata.properties.delegations.map(
        (delegation: any) => JSON.stringify(delegation)
      );
    }
    if (metadata.properties.github)
      spaceMetadataItem.github = metadata.properties.github;
    if (metadata.properties.twitter)
      spaceMetadataItem.twitter = metadata.properties.twitter;
    if (metadata.properties.discord)
      spaceMetadataItem.discord = metadata.properties.discord;
    if (metadata.properties.farcaster)
      spaceMetadataItem.farcaster = metadata.properties.farcaster;
    if (metadata.properties.voting_power_symbol) {
      spaceMetadataItem.voting_power_symbol =
        metadata.properties.voting_power_symbol;
    }

    const executionStrategies: string[] =
      metadata.properties.execution_strategies;
    const executionStrategiesTypes: string[] =
      metadata.properties.execution_strategies_types;
    const executionDestinations = metadata.properties.execution_destinations;

    if (
      executionStrategies &&
      executionStrategiesTypes &&
      executionDestinations
    ) {
      spaceMetadataItem.executors = executionStrategies.map(strategy =>
        getAddress(strategy)
      );
      spaceMetadataItem.executors_types = executionStrategiesTypes;
      spaceMetadataItem.executors_strategies = executionStrategies;
      spaceMetadataItem.executors_destinations = executionDestinations;
    }
  }

  await spaceMetadataItem.save();

  return spaceMetadataItem;
}
