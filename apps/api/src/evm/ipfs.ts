import { getAddress } from '@ethersproject/address';
import { FullConfig } from './config';
import {
  ProposalMetadataItem,
  SpaceMetadataItem,
  StrategiesParsedMetadataDataItem,
  VoteMetadataItem
} from '../../.checkpoint/models';
import { dropIpfs, getJSON, getSpaceName } from '../utils';

export async function handleSpaceMetadata(
  space: string,
  metadataUri: string,
  config: FullConfig
) {
  const exists = await SpaceMetadataItem.loadEntity(
    dropIpfs(metadataUri),
    config.indexerName
  );
  if (exists) return;

  const spaceMetadataItem = new SpaceMetadataItem(
    dropIpfs(metadataUri),
    config.indexerName
  );
  spaceMetadataItem.name = getSpaceName(space);
  spaceMetadataItem.about = '';
  spaceMetadataItem.avatar = '';
  spaceMetadataItem.cover = '';
  spaceMetadataItem.external_url = '';
  spaceMetadataItem.github = '';
  spaceMetadataItem.twitter = '';
  spaceMetadataItem.discord = '';
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
}

// TODO: unify?
export async function handleStrategiesParsedMetadata(
  metadataUri: string,
  config: FullConfig
) {
  const exists = await StrategiesParsedMetadataDataItem.loadEntity(
    dropIpfs(metadataUri),
    config.indexerName
  );
  if (exists) return;

  const strategiesParsedMetadataItem = new StrategiesParsedMetadataDataItem(
    dropIpfs(metadataUri),
    config.indexerName
  );

  const metadata: any = await getJSON(metadataUri);
  if (metadata.name) strategiesParsedMetadataItem.name = metadata.name;
  if (metadata.description)
    strategiesParsedMetadataItem.description = metadata.description;

  if (metadata.properties) {
    if (metadata.properties.decimals) {
      strategiesParsedMetadataItem.decimals = metadata.properties.decimals;
    }
    if (metadata.properties.symbol) {
      strategiesParsedMetadataItem.symbol = metadata.properties.symbol;
    }
    if (metadata.properties.token)
      strategiesParsedMetadataItem.token = metadata.properties.token;
    if (metadata.properties.payload) {
      strategiesParsedMetadataItem.payload = metadata.properties.payload;
    }
  }

  await strategiesParsedMetadataItem.save();
}

// TODO: unify
export async function handleProposalMetadata(
  metadataUri: string,
  config: FullConfig
) {
  const exists = await ProposalMetadataItem.loadEntity(
    dropIpfs(metadataUri),
    config.indexerName
  );
  if (exists) return;

  const proposalMetadataItem = new ProposalMetadataItem(
    dropIpfs(metadataUri),
    config.indexerName
  );
  proposalMetadataItem.choices = ['For', 'Against', 'Abstain'];
  proposalMetadataItem.labels = [];

  const metadata: any = await getJSON(metadataUri);
  if (metadata.title) proposalMetadataItem.title = metadata.title;
  if (metadata.body) proposalMetadataItem.body = metadata.body;
  if (metadata.discussion)
    proposalMetadataItem.discussion = metadata.discussion;
  if (metadata.execution)
    proposalMetadataItem.execution = JSON.stringify(metadata.execution);
  if (
    Array.isArray(metadata.labels) &&
    metadata.labels.every((label: string) => typeof label === 'string')
  ) {
    proposalMetadataItem.labels = metadata.labels;
  }
  if (
    Array.isArray(metadata.choices) &&
    metadata.choices.length === 3 &&
    metadata.choices.every((choice: string) => typeof choice === 'string')
  ) {
    proposalMetadataItem.choices = metadata.choices;
  }

  await proposalMetadataItem.save();
}

// TODO: unify
export async function handleVoteMetadata(
  metadataUri: string,
  config: FullConfig
) {
  const exists = await VoteMetadataItem.loadEntity(
    dropIpfs(metadataUri),
    config.indexerName
  );
  if (exists) return;

  const voteMetadataItem = new VoteMetadataItem(
    dropIpfs(metadataUri),
    config.indexerName
  );

  const metadata: any = await getJSON(metadataUri);
  voteMetadataItem.reason = metadata.reason ?? '';

  await voteMetadataItem.save();
}
