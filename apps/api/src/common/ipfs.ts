import { dropIpfs, getJSON } from './utils';
import {
  ProposalMetadataItem,
  StrategiesParsedMetadataDataItem,
  StrategiesParsedMetadataItem,
  VoteMetadataItem,
  VotingPowerValidationStrategiesParsedMetadataItem
} from '../../.checkpoint/models';

type CommonConfig = {
  indexerName: string;
};

export async function handleProposalMetadata(
  metadataUri: string,
  config: CommonConfig
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

export async function handleStrategiesParsedMetadata(
  metadataUri: string,
  config: CommonConfig
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

export async function handleVoteMetadata(
  metadataUri: string,
  config: CommonConfig
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

export async function handleStrategiesMetadata(
  spaceId: string,
  metadataUris: string[],
  startingIndex: number,
  config: CommonConfig,
  type:
    | typeof StrategiesParsedMetadataItem
    | typeof VotingPowerValidationStrategiesParsedMetadataItem = StrategiesParsedMetadataItem
) {
  for (let i = 0; i < metadataUris.length; i++) {
    const metadataUri = metadataUris[i];
    if (!metadataUri) continue;

    const index = startingIndex + i;
    const uniqueId = crypto.randomUUID();

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

export async function handleVotingPowerValidationMetadata(
  spaceId: string,
  metadataUri: string,
  config: CommonConfig
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
