import { starknet } from '@snapshot-labs/checkpoint';
import { validateAndParseAddress } from 'starknet';
import {
  handleProposalMetadata,
  handleSpaceMetadata,
  handleVoteMetadata
} from './ipfs';
import { networkProperties } from './overrrides';
import {
  dropIpfs,
  findVariant,
  formatAddressVariant,
  getCurrentTimestamp,
  getVoteValue,
  handleExecutionStrategy,
  handleStrategiesMetadata,
  longStringToText,
  registerProposal,
  updateProposaValidationStrategy
} from './utils';
import {
  Leaderboard,
  Proposal,
  Space,
  User,
  Vote
} from '../.checkpoint/models';

type Strategy = {
  address: string;
  params: string[];
};

export const handleContractDeployed: starknet.Writer = async ({
  blockNumber,
  event,
  instance
}) => {
  console.log('Handle contract deployed');

  if (!event) return;

  const paddedClassHash = validateAndParseAddress(event.class_hash);

  if (paddedClassHash === networkProperties.spaceClassHash) {
    await instance.executeTemplate('Space', {
      contract: event.contract_address,
      start: blockNumber
    });
  } else {
    console.log('Unknown class hash', paddedClassHash);
  }
};

export const handleSpaceCreated: starknet.Writer = async ({
  block,
  tx,
  event
}) => {
  console.log('Handle space created');

  if (!event || !tx.transaction_hash) return;

  const strategies: string[] = event.voting_strategies.map(
    (strategy: Strategy) => strategy.address
  );
  const strategiesParams = event.voting_strategies.map((strategy: Strategy) =>
    strategy.params.join(',')
  ); // different format than sx-evm
  const strategiesMetadataUris = event.voting_strategy_metadata_uris.map(
    (array: string[]) => longStringToText(array)
  );

  const id = validateAndParseAddress(event.space);

  const space = new Space(id);
  space.verified = networkProperties.verifiedSpaces.includes(id);
  space.turbo = false;
  space.metadata = null;
  space.controller = validateAndParseAddress(event.owner);
  space.voting_delay = Number(BigInt(event.voting_delay).toString());
  space.min_voting_period = Number(
    BigInt(event.min_voting_duration).toString()
  );
  space.max_voting_period = Number(
    BigInt(event.max_voting_duration).toString()
  );
  space.proposal_threshold = '0';
  space.strategies_indices = strategies.map((_, i) => i);
  // NOTE: deprecated
  space.strategies_indicies = space.strategies_indices;
  space.strategies = strategies;
  space.next_strategy_index = strategies.length;
  space.strategies_params = strategiesParams;
  space.strategies_metadata = strategiesMetadataUris;
  space.authenticators = event.authenticators;
  space.proposal_count = 0;
  space.vote_count = 0;
  space.proposer_count = 0;
  space.voter_count = 0;
  space.created = block?.timestamp ?? getCurrentTimestamp();
  space.tx = tx.transaction_hash;

  await updateProposaValidationStrategy(
    space,
    event.proposal_validation_strategy.address,
    event.proposal_validation_strategy.params,
    event.proposal_validation_strategy_metadata_uri
  );

  try {
    const metadataUri = longStringToText(event.metadata_uri || []).replaceAll(
      '\x00',
      ''
    );
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

export const handleMetadataUriUpdated: starknet.Writer = async ({
  rawEvent,
  event
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space metadata uri updated');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  try {
    const metadataUri = longStringToText(event.metadata_uri).replaceAll(
      '\x00',
      ''
    );
    await handleSpaceMetadata(spaceId, metadataUri);

    const space = await Space.loadEntity(spaceId);
    if (!space) return;

    space.metadata = dropIpfs(metadataUri);

    await space.save();
  } catch (e) {
    console.log('failed to update space metadata', e);
  }
};

export const handleMinVotingDurationUpdated: starknet.Writer = async ({
  rawEvent,
  event
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space min voting duration updated');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.min_voting_period = Number(
    BigInt(event.min_voting_duration).toString()
  );

  await space.save();
};

export const handleMaxVotingDurationUpdated: starknet.Writer = async ({
  rawEvent,
  event
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space max voting duration updated');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.max_voting_period = Number(
    BigInt(event.max_voting_duration).toString()
  );

  await space.save();
};

export const handleOwnershipTransferred: starknet.Writer = async ({
  rawEvent,
  event
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space ownership transferred');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.controller = validateAndParseAddress(event.new_owner);

  await space.save();
};

export const handleVotingDelayUpdated: starknet.Writer = async ({
  rawEvent,
  event
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space voting delay updated');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.voting_delay = Number(BigInt(event.voting_delay).toString());

  await space.save();
};

export const handleAuthenticatorsAdded: starknet.Writer = async ({
  rawEvent,
  event
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space authenticators added');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  space.authenticators = [
    ...new Set([...space.authenticators, ...event.authenticators])
  ];

  await space.save();
};

export const handleAuthenticatorsRemoved: starknet.Writer = async ({
  rawEvent,
  event
}) => {
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

export const handleVotingStrategiesAdded: starknet.Writer = async ({
  rawEvent,
  event
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space voting strategies added');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  const initialNextStrategy = space.next_strategy_index;

  const strategies: string[] = event.voting_strategies.map(
    (strategy: Strategy) => strategy.address
  );
  const strategiesParams = event.voting_strategies.map((strategy: Strategy) =>
    strategy.params.join(',')
  );
  const strategiesMetadataUris = event.voting_strategy_metadata_uris.map(
    (array: string[]) => longStringToText(array)
  );

  space.strategies_indices = [
    ...space.strategies_indices,
    ...strategies.map((_, i) => space.next_strategy_index + i)
  ];
  // NOTE: deprecated
  space.strategies_indicies = space.strategies_indices;
  space.strategies = [...space.strategies, ...strategies];
  space.next_strategy_index += strategies.length;
  space.strategies_params = [...space.strategies_params, ...strategiesParams];
  space.strategies_metadata = [
    ...space.strategies_metadata,
    ...strategiesMetadataUris
  ];

  try {
    await handleStrategiesMetadata(
      space.id,
      strategiesMetadataUris,
      initialNextStrategy
    );
  } catch (e) {
    console.log('failed to handle strategies metadata', e);
  }

  await space.save();
};

export const handleVotingStrategiesRemoved: starknet.Writer = async ({
  rawEvent,
  event
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space voting strategies removed');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  const indicesToRemove = event.voting_strategy_indices.map((index: string) =>
    space.strategies_indices.indexOf(parseInt(index))
  );

  space.strategies_indices = space.strategies_indices.filter(
    (_, i) => !indicesToRemove.includes(i)
  );
  // NOTE: deprecated
  space.strategies_indicies = space.strategies_indices;
  space.strategies = space.strategies.filter(
    (_, i) => !indicesToRemove.includes(i)
  );
  space.strategies_params = space.strategies_params.filter(
    (_, i) => !indicesToRemove.includes(i)
  );
  space.strategies_metadata = space.strategies_metadata.filter(
    (_, i) => !indicesToRemove.includes(i)
  );

  await space.save();
};

export const handleProposalValidationStrategyUpdated: starknet.Writer = async ({
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

export const handlePropose: starknet.Writer = async ({
  tx,
  rawEvent,
  event
}) => {
  if (!rawEvent || !event || !tx.transaction_hash) return;

  console.log('Handle propose');

  const spaceId = validateAndParseAddress(rawEvent.from_address);

  const space = await Space.loadEntity(spaceId);
  if (!space) return;

  const proposalId = parseInt(BigInt(event.proposal_id).toString());
  const author = formatAddressVariant(findVariant(event.author));

  const created =
    BigInt(event.proposal.start_timestamp) - BigInt(space.voting_delay);

  // for erc20votes strategies we have to add artificial delay to prevent voting within same block
  // snapshot needs to remain the same as we need real timestamp to compute VP
  let startTimestamp = BigInt(event.proposal.start_timestamp);
  let minEnd = BigInt(event.proposal.min_end_timestamp);
  if (
    space.strategies.some(
      strategy => strategy === networkProperties.erc20VotesStrategy
    )
  ) {
    const minimumDelay = 10n * 60n;
    startTimestamp =
      startTimestamp > created + minimumDelay
        ? startTimestamp
        : created + minimumDelay;
    minEnd = minEnd > startTimestamp ? minEnd : startTimestamp;
  }

  const proposal = new Proposal(`${spaceId}/${proposalId}`);
  proposal.proposal_id = proposalId;
  proposal.space = spaceId;
  proposal.author = author.address;
  proposal.metadata = null;
  proposal.execution_hash = event.proposal.execution_payload_hash;
  proposal.start = parseInt(startTimestamp.toString());
  proposal.min_end = parseInt(minEnd.toString());
  proposal.max_end = parseInt(
    BigInt(event.proposal.max_end_timestamp).toString()
  );
  proposal.snapshot = parseInt(
    BigInt(event.proposal.start_timestamp).toString()
  );
  proposal.execution_time = 0;
  proposal.execution_strategy = validateAndParseAddress(
    event.proposal.execution_strategy
  );
  proposal.execution_strategy_type = 'none';
  proposal.scores_1 = '0';
  proposal.scores_2 = '0';
  proposal.scores_3 = '0';
  proposal.scores_total = '0';
  proposal.quorum = 0n;
  proposal.strategies_indices = space.strategies_indices;
  // NOTE: deprecated
  proposal.strategies_indicies = proposal.strategies_indices;
  proposal.strategies = space.strategies;
  proposal.strategies_params = space.strategies_params;
  proposal.created = parseInt(created.toString());
  proposal.tx = tx.transaction_hash;
  proposal.execution_tx = null;
  proposal.veto_tx = null;
  proposal.vote_count = 0;
  proposal.execution_ready = true;
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
    proposal.execution_destination = executionStrategy.destinationAddress;
    proposal.quorum = executionStrategy.quorum;
  }

  try {
    const metadataUri = longStringToText(event.metadata_uri);
    await handleProposalMetadata(metadataUri);

    proposal.metadata = dropIpfs(metadataUri);
  } catch (e) {
    console.log(JSON.stringify(e).slice(0, 256));
  }

  const existingUser = await User.loadEntity(author.address);
  if (existingUser) {
    existingUser.proposal_count += 1;
    await existingUser.save();
  } else {
    const user = new User(author.address);
    user.address_type = author.type;
    user.created = parseInt(created.toString());
    await user.save();
  }

  let leaderboardItem = await Leaderboard.loadEntity(
    `${spaceId}/${author.address}`
  );
  if (!leaderboardItem) {
    leaderboardItem = new Leaderboard(`${spaceId}/${author.address}`);
    leaderboardItem.space = spaceId;
    leaderboardItem.user = author.address;
    leaderboardItem.vote_count = 0;
    leaderboardItem.proposal_count = 0;
  }

  leaderboardItem.proposal_count += 1;
  await leaderboardItem.save();

  if (leaderboardItem.proposal_count === 1) space.proposer_count += 1;
  space.proposal_count += 1;

  const herodotusStrategiesIndices = space.strategies
    .map((strategy, i) => [strategy, i] as const)
    .filter(([strategy]) =>
      networkProperties.herodotusStrategies.includes(
        validateAndParseAddress(strategy)
      )
    );

  for (const herodotusStrategy of herodotusStrategiesIndices) {
    const [strategy, i] = herodotusStrategy;
    const params = space.strategies_params[i];
    if (!params) continue;

    const [l1TokenAddress] = params.split(',');
    if (!l1TokenAddress) continue;

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

export const handleCancel: starknet.Writer = async ({ rawEvent, event }) => {
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

export const handleUpdate: starknet.Writer = async ({
  block,
  rawEvent,
  event
}) => {
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
    event.execution_strategy,
    event.payload
  );
  if (executionStrategy) {
    proposal.execution_strategy_type = executionStrategy.executionStrategyType;
    proposal.quorum = executionStrategy.quorum;
  }

  await proposal.save();
};

export const handleExecute: starknet.Writer = async ({
  tx,
  rawEvent,
  event
}) => {
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

export const handleVote: starknet.Writer = async ({
  block,
  tx,
  rawEvent,
  event
}) => {
  if (!rawEvent || !event) return;

  console.log('Handle vote');

  const spaceId = validateAndParseAddress(rawEvent.from_address);
  const proposalId = parseInt(event.proposal_id);
  const choice = getVoteValue(findVariant(event.choice).key);
  const vp = BigInt(event.voting_power);

  const created = block?.timestamp ?? getCurrentTimestamp();
  const voter = formatAddressVariant(findVariant(event.voter));

  const vote = new Vote(`${spaceId}/${proposalId}/${voter.address}`);
  vote.space = spaceId;
  vote.proposal = proposalId;
  vote.voter = voter.address;
  vote.choice = choice;
  vote.vp = vp.toString();
  vote.created = created;
  vote.tx = tx.transaction_hash;

  try {
    const metadataUri = longStringToText(event.metadata_uri);
    await handleVoteMetadata(metadataUri);

    vote.metadata = dropIpfs(metadataUri);
  } catch (e) {
    console.log(JSON.stringify(e).slice(0, 256));
  }

  await vote.save();

  const existingUser = await User.loadEntity(voter.address);
  if (existingUser) {
    existingUser.vote_count += 1;
    await existingUser.save();
  } else {
    const user = new User(voter.address);
    user.address_type = voter.type;
    user.created = created;
    await user.save();
  }

  let leaderboardItem = await Leaderboard.loadEntity(
    `${spaceId}/${voter.address}`
  );
  if (!leaderboardItem) {
    leaderboardItem = new Leaderboard(`${spaceId}/${voter.address}`);
    leaderboardItem.space = spaceId;
    leaderboardItem.user = voter.address;
    leaderboardItem.vote_count = 0;
    leaderboardItem.proposal_count = 0;
  }

  leaderboardItem.vote_count += 1;
  await leaderboardItem.save();

  const space = await Space.loadEntity(spaceId);
  if (space) {
    space.vote_count += 1;
    if (leaderboardItem.vote_count === 1) space.voter_count += 1;

    await space.save();
  }

  const proposal = await Proposal.loadEntity(`${spaceId}/${proposalId}`);
  if (proposal) {
    proposal.vote_count += 1;
    proposal.scores_total = (
      BigInt(proposal.scores_total) + BigInt(vote.vp)
    ).toString();
    proposal[`scores_${choice}`] = (
      BigInt(proposal[`scores_${choice}`]) + BigInt(vote.vp)
    ).toString();
    await proposal.save();
  }
};
