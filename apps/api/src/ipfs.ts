import {
  SpaceMetadataItem,
  ProposalMetadataItem,
  StrategiesParsedMetadataDataItem
} from '../.checkpoint/models';
import { dropIpfs, getJSON, getSpaceName } from './utils';

export async function handleSpaceMetadata(space: string, metadataUri: string) {
  const exists = await SpaceMetadataItem.loadEntity(dropIpfs(metadataUri));
  if (exists) return;

  const spaceMetadataItem = new SpaceMetadataItem(dropIpfs(metadataUri));
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
  spaceMetadataItem.executors_types = [];
  spaceMetadataItem.delegations = [];

  const metadata: any = metadataUri ? await getJSON(metadataUri) : {};

  if (metadata.name) spaceMetadataItem.name = metadata.name;
  if (metadata.description) spaceMetadataItem.about = metadata.description;
  if (metadata.avatar) spaceMetadataItem.avatar = metadata.avatar;
  if (metadata.external_url) spaceMetadataItem.external_url = metadata.external_url;

  if (metadata.properties) {
    if (metadata.properties.cover) spaceMetadataItem.cover = metadata.properties.cover;

    if (metadata.properties.delegations) {
      spaceMetadataItem.delegations = metadata.properties.delegations.map((delegation: any) =>
        JSON.stringify(delegation)
      );
    }
    if (metadata.properties.github) spaceMetadataItem.github = metadata.properties.github;
    if (metadata.properties.twitter) spaceMetadataItem.twitter = metadata.properties.twitter;
    if (metadata.properties.discord) spaceMetadataItem.discord = metadata.properties.discord;
    if (metadata.properties.voting_power_symbol) {
      spaceMetadataItem.voting_power_symbol = metadata.properties.voting_power_symbol;
    }
    if (metadata.properties.wallets && metadata.properties.wallets.length > 0) {
      spaceMetadataItem.wallet = metadata.properties.wallets[0];
    }
    if (
      metadata.properties.execution_strategies &&
      metadata.properties.execution_strategies_types
    ) {
      spaceMetadataItem.executors = metadata.properties.execution_strategies;
      spaceMetadataItem.executors_types = metadata.properties.execution_strategies_types;
    }
  }

  await spaceMetadataItem.save();
}

export async function handleProposalMetadata(metadataUri: string) {
  const exists = await ProposalMetadataItem.loadEntity(dropIpfs(metadataUri));
  if (exists) return;

  const proposalMetadataItem = new ProposalMetadataItem(dropIpfs(metadataUri));

  const metadata: any = await getJSON(metadataUri);
  if (metadata.title) proposalMetadataItem.title = metadata.title;
  if (metadata.body) proposalMetadataItem.body = metadata.body;
  if (metadata.discussion) proposalMetadataItem.discussion = metadata.discussion;
  if (metadata.execution) proposalMetadataItem.execution = JSON.stringify(metadata.execution);

  await proposalMetadataItem.save();
}

export async function handleStrategiesParsedMetadata(metadataUri: string) {
  const exists = await StrategiesParsedMetadataDataItem.loadEntity(dropIpfs(metadataUri));
  if (exists) return;

  const strategiesParsedMetadataItem = new StrategiesParsedMetadataDataItem(dropIpfs(metadataUri));

  const metadata: any = await getJSON(metadataUri);
  if (metadata.name) strategiesParsedMetadataItem.name = metadata.name;
  if (metadata.description) strategiesParsedMetadataItem.description = metadata.description;

  if (metadata.properties) {
    if (metadata.properties.decimals) {
      strategiesParsedMetadataItem.decimals = metadata.properties.decimals;
    }
    if (metadata.properties.symbol) {
      strategiesParsedMetadataItem.symbol = metadata.properties.symbol;
    }
    if (metadata.properties.token) strategiesParsedMetadataItem.token = metadata.properties.token;
    if (metadata.properties.payload) {
      strategiesParsedMetadataItem.payload = metadata.properties.payload;
    }
  }

  await strategiesParsedMetadataItem.save();
}
