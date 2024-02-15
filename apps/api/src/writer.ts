import { validateAndParseAddress } from 'starknet';
import { CheckpointWriter } from '@snapshot-labs/checkpoint';
import { Space, Vote, User, Proposal } from '../.checkpoint/models';
import { handleProposalMetadata, handleSpaceMetadata } from './ipfs';
import { networkProperties } from './overrrides';
import {
  getCurrentTimestamp,
  dropIpfs,
  findVariant,
  getVoteValue,
  handleExecutionStrategy,
  handleStrategiesMetadata,
  longStringToText,
  updateProposaValidationStrategy,
  registerProposal
} from './utils';

export const handleSpaceDeployed: CheckpointWriter = async ({ blockNumber, event, instance }) => {
  console.log('Handle space deployed');

  if (!event) return;

  await instance.executeTemplate('Space', {
    contract: event.contract_address,
    start: blockNumber
  });
};

export const handleSpaceCreated: CheckpointWriter = async ({ block, tx, event }) => {
  console.log('Handle space created');

  if (!event || !tx.transaction_hash) return;

  const strategies: string[] = event.voting_strategies.map(strategy => strategy.address);
  const strategiesParams = event.voting_strategies.map(strategy => strategy.params.join(',')); // different format than sx-evm
  const strategiesMetadataUris = event.voting_strategy_metadata_uris.map(array =>
    longStringToText(array)
  );

  const space = new Space(validateAndParseAddress(event.space));
  space.metadata = null;
  space.controller = validateAndParseAddress(event.owner);
  space.voting_delay = Number(BigInt(event.voting_delay).toString());
  space.min_voting_period = Number(BigInt(event.min_voting_duration).toString());
  space.max_voting_period = Number(BigInt(event.max_voting_duration).toString());
  space.proposal_threshold = 0;
  space.strategies_indicies = strategies.map((_, i) => i);
  space.strategies = strategies;
  space.next_strategy_index = strategies.length;
  space.strategies_params = strategiesParams;
  space.strategies_metadata = strategiesMetadataUris;
  space.authenticators = event.authenticators;
  space.proposal_count = 0;
  space.vote_count = 0;
  space.created = block?.timestamp ?? getCurrentTimestamp();
  space.tx = tx.transaction_hash;

  await updateProposaValidationStrategy(
    space,
    event.proposal_validation_strategy.address,
    event.proposal_validation_strategy.params,
    event.proposal_validation_strategy_metadata_uri
  );

  try {
    const metadataUri = longStringToText(event.metadata_uri || []).replaceAll('\x00', '');
    await handleSpaceMetadata(space.id, metadataUri);

    space.metadata = dropIpfs(metadataUri);
  } catch (e) {
    console.log('failed to parse space metadata', e);
  }

  try {
    await handleStrategiesMetadata(space.id, strategiesMetadataUris, 0);
  } catch (e) {
    console.log('failed to handle strategies metadata', e);
  }

  await space.save();
};

export const handleMetadataUriUpdated: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space metadata uri updated');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  try {
    const metadataUri = longStringToText(event.metadata_uri).replaceAll('\x00', '');
    await handleSpaceMetadata(spaceId, metadataUri);

    const space = await Space.loadEntity(spaceId);
    if (!space) return;

    space.metadata = dropIpfs(metadataUri);

    await space.save();
  } catch (e) {
    console.log('failed to update space metadata', e);
    throw new Error('d');
  }
};

export const handleMinVotingDurationUpdated: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space min voting duration updated');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.min_voting_period = Number(BigInt(event.min_voting_duration).toString());

  await space.save();
};

export const handleMaxVotingDurationUpdated: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space max voting duration updated');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.max_voting_period = Number(BigInt(event.max_voting_duration).toString());

  await space.save();
};

export const handleOwnershipTransferred: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space ownership transferred');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.controller = validateAndParseAddress(event.new_owner);

  await space.save();
};

export const handleVotingDelayUpdated: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space voting delay updated');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.voting_delay = Number(BigInt(event.voting_delay).toString());

  await space.save();
};

export const handleAuthenticatorsAdded: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space authenticators added');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.authenticators = [...new Set([...space.authenticators, ...event.authenticators])];

  await space.save();
};

export const handleAuthenticatorsRemoved: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space authenticators removed');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.authenticators = space.authenticators.filter(
    authenticator => !event.authenticators.includes(authenticator)
  );

  await space.save();
};

export const handleVotingStrategiesAdded: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space voting strategies added');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  const initialNextStrategy = space.next_strategy_index;

  const strategies = event.voting_strategies.map(strategy => strategy.address);
  const strategiesParams = event.voting_strategies.map(strategy => strategy.params.join(','));
  const strategiesMetadataUris = event.voting_strategy_metadata_uris.map(array =>
    longStringToText(array)
  );

  space.strategies_indicies = [
    ...space.strategies_indicies,
    ...strategies.map((_, i) => space.next_strategy_index + i)
  ];
  space.strategies = [...space.strategies, ...strategies];
  space.next_strategy_index += strategies.length;
  space.strategies_params = [...space.strategies_params, ...strategiesParams];
  space.strategies_metadata = [...space.strategies_metadata, ...strategiesMetadataUris];

  try {
    await handleStrategiesMetadata(space.id, strategiesMetadataUris, initialNextStrategy);
  } catch (e) {
    console.log('failed to handle strategies metadata', e);
  }

  await space.save();
};

export const handleVotingStrategiesRemoved: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space voting strategies removed');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  const indiciesToRemove = event.voting_strategy_indices.map((index: string) =>
    space.strategies_indicies.indexOf(parseInt(index))
  );

  space.strategies_indicies = space.strategies_indicies.filter(
    (_, i) => !indiciesToRemove.includes(i)
  );
  space.strategies = space.strategies.filter((_, i) => !indiciesToRemove.includes(i));
  space.strategies_params = space.strategies_params.filter((_, i) => !indiciesToRemove.includes(i));
  space.strategies_metadata = space.strategies_metadata.filter(
    (_, i) => !indiciesToRemove.includes(i)
  );

  await space.save();
};

export const handleProposalValidationStrategyUpdated: CheckpointWriter = async ({
  rawEvent,
  event
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space proposal validation strategy updated');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  await updateProposaValidationStrategy(
    space,
    event.proposal_validation_strategy.address,
    event.proposal_validation_strategy.params,
    event.proposal_validation_strategy_metadata_uri
  );

  await space.save();
};

export const handlePropose: CheckpointWriter = async ({ block, tx, rawEvent, event }) => {
  if (!rawEvent || !event || !tx.transaction_hash) return;

  console.log('Handle propose');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  const proposalId = parseInt(BigInt(event.proposal_id).toString());
  const author = findVariant(event.author).value;

  const created = block?.timestamp ?? getCurrentTimestamp();

  const proposal = new Proposal(`${spaceId}/${proposalId}`);
  proposal.proposal_id = proposalId;
  proposal.space = spaceId;
  proposal.author = author;
  proposal.metadata = null;
  proposal.execution_hash = event.proposal.execution_payload_hash;
  proposal.start = parseInt(BigInt(event.proposal.start_timestamp).toString());
  proposal.min_end = parseInt(BigInt(event.proposal.min_end_timestamp).toString());
  proposal.max_end = parseInt(BigInt(event.proposal.max_end_timestamp).toString());
  proposal.snapshot = parseInt(BigInt(event.proposal.start_timestamp).toString());
  proposal.execution_time = 0;
  proposal.execution_strategy = validateAndParseAddress(event.proposal.execution_strategy);
  proposal.execution_strategy_type = 'none';
  proposal.scores_1 = '0';
  proposal.scores_2 = '0';
  proposal.scores_3 = '0';
  proposal.scores_total = '0';
  proposal.quorum = 0n;
  proposal.strategies_indicies = space.strategies_indicies;
  proposal.strategies = space.strategies;
  proposal.strategies_params = space.strategies_params;
  proposal.created = created;
  proposal.tx = tx.transaction_hash;
  proposal.execution_tx = null;
  proposal.veto_tx = null;
  proposal.vote_count = 0;
  proposal.executed = false;
  proposal.vetoed = false;
  proposal.completed = false;
  proposal.cancelled = false;

  const executionStrategy = await handleExecutionStrategy(
    event.proposal.execution_strategy,
    event.payload
  );
  if (executionStrategy) {
    proposal.execution_strategy_type = executionStrategy.executionStrategyType;
    proposal.quorum = executionStrategy.quorum;
  }

  try {
    const metadataUri = longStringToText(event.metadata_uri);
    await handleProposalMetadata(metadataUri);

    proposal.metadata = dropIpfs(metadataUri);
  } catch (e) {
    console.log(JSON.stringify(e).slice(0, 256));
  }

  space.proposal_count += 1;

  const existingUser = await User.loadEntity(author);
  if (existingUser) {
    existingUser.proposal_count += 1;
    await existingUser.save();
  } else {
    const user = new User(author);
    user.created = created;
    await user.save();
  }

  const herodotusStrategiesIndicies = space.strategies
    .map((strategy, i) => [strategy, i] as const)
    .filter(([strategy]) =>
      networkProperties.herodotusStrategies.includes(validateAndParseAddress(strategy))
    );

  for (const herodotusStrategy of herodotusStrategiesIndicies) {
    const [strategy, i] = herodotusStrategy;
    const [l1TokenAddress] = space.strategies_params[i].split(',');

    try {
      await registerProposal({
        l1TokenAddress,
        strategyAddress: strategy,
        snapshotTimestamp: proposal.snapshot
      });
    } catch (e) {
      console.log('failed to register proposal');
    }
  }

  await Promise.all([proposal.save(), space.save()]);
};

export const handleCancel: CheckpointWriter = async ({ rawEvent, event }) => {
  if (!rawEvent || !event) return;

  console.log('Handle cancel');

  const spaceId = validateAndParseAddress(rawEvent.from_address);
  const proposalId = `${spaceId}/${parseInt(event.proposal_id)}`;

  const [proposal, space] = await Promise.all([
    Proposal.loadEntity(proposalId),
    Space.loadEntity(spaceId)
  ]);
  if (!proposal || !space) return;

  proposal.cancelled = true;
  space.proposal_count -= 1;
  space.vote_count -= proposal.vote_count;

  await Promise.all([proposal.save(), space.save()]);
};

export const handleUpdate: CheckpointWriter = async ({ block, rawEvent, event }) => {
  if (!rawEvent || !event) return;

  console.log('Handle update');

  const spaceId = validateAndParseAddress(rawEvent.from_address);
  const proposalId = `${spaceId}/${parseInt(event.proposal_id)}`;
  const metadataUri = longStringToText(event.metadata_uri);

  const proposal = await Proposal.loadEntity(proposalId);
  if (!proposal) return;

  try {
    await handleProposalMetadata(metadataUri);

    proposal.metadata = dropIpfs(metadataUri);
    proposal.edited = block?.timestamp ?? getCurrentTimestamp();
  } catch (e) {
    console.log('failed to update proposal metadata', e);
  }

  const executionStrategy = await handleExecutionStrategy(
    event.proposal.execution_strategy,
    event.payload
  );
  if (executionStrategy) {
    proposal.execution_strategy_type = executionStrategy.executionStrategyType;
    proposal.quorum = executionStrategy.quorum;
  }

  await proposal.save();
};

export const handleExecute: CheckpointWriter = async ({ tx, rawEvent, event }) => {
  if (!rawEvent || !event) return;

  console.log('Handle execute');

  const spaceId = validateAndParseAddress(rawEvent.from_address);
  const proposalId = `${spaceId}/${parseInt(event.proposal_id)}`;

  const proposal = await Proposal.loadEntity(proposalId);
  if (!proposal) return;

  proposal.executed = true;
  proposal.completed = true;
  proposal.execution_tx = tx.transaction_hash ?? null;

  await proposal.save();
};

export const handleVote: CheckpointWriter = async ({ block, tx, rawEvent, event }) => {
  if (!rawEvent || !event) return;

  console.log('Handle vote');

  const spaceId = validateAndParseAddress(rawEvent.from_address);
  const proposalId = parseInt(event.proposal_id);
  const voter = findVariant(event.voter).value;
  const choice = getVoteValue(findVariant(event.choice).key);
  const vp = BigInt(event.voting_power);

  const created = block?.timestamp ?? getCurrentTimestamp();

  const vote = new Vote(`${spaceId}/${proposalId}/${voter}`);
  vote.space = spaceId;
  vote.proposal = proposalId;
  vote.voter = voter;
  vote.choice = choice;
  vote.vp = vp.toString();
  vote.created = created;
  vote.tx = tx.transaction_hash;
  await vote.save();

  const existingUser = await User.loadEntity(voter);
  if (existingUser) {
    existingUser.vote_count += 1;
    await existingUser.save();
  } else {
    const user = new User(voter);
    user.created = created;
    await user.save();
  }

  const space = await Space.loadEntity(spaceId);
  if (space) {
    space.vote_count += 1;
    await space.save();
  }

  const proposal = await Proposal.loadEntity(`${spaceId}/${proposalId}`);
  if (proposal) {
    proposal.vote_count += 1;
    proposal.scores_total = (BigInt(proposal.scores_total) + BigInt(vote.vp)).toString();
    proposal[`scores_${vote.choice}`] = (
      BigInt(proposal[`scores_${vote.choice}`]) + BigInt(vote.vp)
    ).toString();
    await proposal.save();
  }
};
