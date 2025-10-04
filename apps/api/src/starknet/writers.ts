import { starknet } from '@snapshot-labs/checkpoint';
import { hash, validateAndParseAddress } from 'starknet';
import { FullConfig } from './config';
import { handleSpaceMetadata } from './ipfs';
import logger from './logger';
import {
  findVariant,
  formatAddressVariant,
  getVoteValue,
  handleExecutionStrategy,
  longStringToText,
  registerProposal,
  updateProposalValidationStrategy
} from './utils';
import {
  ExecutionStrategy,
  Leaderboard,
  Proposal,
  Space,
  SpaceMetadataItem,
  User,
  Vote
} from '../../.checkpoint/models';
import {
  handleProposalMetadata,
  handleStrategiesMetadata,
  handleVoteMetadata
} from '../common/ipfs';
import {
  dropIpfs,
  getCurrentTimestamp,
  getParsedVP,
  getProposalLink,
  getSpaceDecimals,
  getSpaceLink,
  updateCounter
} from '../common/utils';

type Strategy = {
  address: string;
  params: string[];
};

export function createWriters(config: FullConfig) {
  const handleContractDeployed: starknet.Writer = async ({
    blockNumber,
    event,
    helpers: { executeTemplate }
  }) => {
    if (!event) return;

    logger.info('Handle contract deployed');

    const paddedClassHash = validateAndParseAddress(event.class_hash);

    if (paddedClassHash === config.overrides.spaceClassHash) {
      await executeTemplate('Space', {
        contract: event.contract_address,
        start: blockNumber
      });
    } else {
      logger.warn({ classHash: paddedClassHash }, 'Unknown class hash');
    }
  };

  const handleSpaceCreated: starknet.Writer = async ({
    block,
    txId,
    event
  }) => {
    if (!event || !txId) return;

    logger.info('Handle space deployed');

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

    const space = new Space(id, config.indexerName);
    space.protocol = 'snapshot-x';
    space.link = getSpaceLink({
      networkId: config.indexerName,
      spaceId: id
    });
    space.verified = config.overrides.verifiedSpaces.includes(id);
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
    space.strategies = strategies;
    space.next_strategy_index = strategies.length;
    space.strategies_params = strategiesParams;
    space.strategies_metadata = strategiesMetadataUris;
    space.strategies_decimals = [];
    space.vp_decimals = 0;
    space.authenticators = event.authenticators;
    space.proposal_count = 0;
    space.vote_count = 0;
    space.proposer_count = 0;
    space.voter_count = 0;
    space.created = block?.timestamp ?? getCurrentTimestamp();
    space.tx = txId;

    await updateProposalValidationStrategy(
      space,
      event.proposal_validation_strategy.address,
      event.proposal_validation_strategy.params,
      event.proposal_validation_strategy_metadata_uri,
      config
    );

    try {
      const metadataUri = longStringToText(event.metadata_uri || []).replaceAll(
        '\x00',
        ''
      );
      await handleSpaceMetadata(space.id, metadataUri, config);

      space.metadata = dropIpfs(metadataUri);
    } catch (err) {
      logger.warn({ err }, 'Failed to handle space metadata');
    }

    try {
      const { strategiesDecimals } = await handleStrategiesMetadata(
        space.id,
        strategiesMetadataUris,
        0,
        config
      );

      space.strategies_decimals = strategiesDecimals;
      space.vp_decimals = getSpaceDecimals(space.strategies_decimals);
    } catch (err) {
      logger.warn({ err }, 'Failed to handle strategies metadata');
    }

    await updateCounter(config.indexerName, 'space_count', 1);

    await space.save();
  };

  const handleMetadataUriUpdated: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space metadata uri updated');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    try {
      const metadataUri = longStringToText(event.metadata_uri).replaceAll(
        '\x00',
        ''
      );
      await handleSpaceMetadata(spaceId, metadataUri, config);

      const space = await Space.loadEntity(spaceId, config.indexerName);
      if (!space) return;

      space.metadata = dropIpfs(metadataUri);

      await space.save();
    } catch (err) {
      logger.warn({ err }, 'Failed to handle space metadata');
    }
  };

  const handleMinVotingDurationUpdated: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space min voting duration updated');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.min_voting_period = Number(
      BigInt(event.min_voting_duration).toString()
    );

    await space.save();
  };

  const handleMaxVotingDurationUpdated: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space max voting duration updated');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.max_voting_period = Number(
      BigInt(event.max_voting_duration).toString()
    );

    await space.save();
  };

  const handleOwnershipTransferred: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space ownership transferred');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.controller = validateAndParseAddress(event.new_owner);

    await space.save();
  };

  const handleVotingDelayUpdated: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space voting delay updated');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.voting_delay = Number(BigInt(event.voting_delay).toString());

    await space.save();
  };

  const handleAuthenticatorsAdded: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space authenticators added');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.authenticators = [
      ...new Set([...space.authenticators, ...event.authenticators])
    ];

    await space.save();
  };

  const handleAuthenticatorsRemoved: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space authenticators removed');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.authenticators = space.authenticators.filter(
      authenticator => !event.authenticators.includes(authenticator)
    );

    await space.save();
  };

  const handleVotingStrategiesAdded: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space voting strategies added');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
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
    space.strategies = [...space.strategies, ...strategies];
    space.next_strategy_index += strategies.length;
    space.strategies_params = [...space.strategies_params, ...strategiesParams];
    space.strategies_metadata = [
      ...space.strategies_metadata,
      ...strategiesMetadataUris
    ];

    try {
      const { strategiesDecimals } = await handleStrategiesMetadata(
        space.id,
        strategiesMetadataUris,
        initialNextStrategy,
        config
      );

      space.strategies_decimals = [
        ...space.strategies_decimals,
        ...strategiesDecimals
      ];
      space.vp_decimals = getSpaceDecimals(space.strategies_decimals);
    } catch (err) {
      logger.warn({ err }, 'Failed to handle strategies metadata');
    }

    await space.save();
  };

  const handleVotingStrategiesRemoved: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space voting strategies removed');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    const indicesToRemove = event.voting_strategy_indices.map((index: string) =>
      space.strategies_indices.indexOf(parseInt(index))
    );

    space.strategies_indices = space.strategies_indices.filter(
      (_, i) => !indicesToRemove.includes(i)
    );
    space.strategies = space.strategies.filter(
      (_, i) => !indicesToRemove.includes(i)
    );
    space.strategies_params = space.strategies_params.filter(
      (_, i) => !indicesToRemove.includes(i)
    );
    space.strategies_metadata = space.strategies_metadata.filter(
      (_, i) => !indicesToRemove.includes(i)
    );
    space.strategies_decimals = space.strategies_decimals.filter(
      (_, i) => !indicesToRemove.includes(i)
    );
    space.vp_decimals = getSpaceDecimals(space.strategies_decimals);

    await space.save();
  };

  const handleProposalValidationStrategyUpdated: starknet.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space proposal validation strategy updated');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    await updateProposalValidationStrategy(
      space,
      event.proposal_validation_strategy.address,
      event.proposal_validation_strategy.params,
      event.proposal_validation_strategy_metadata_uri,
      config
    );

    await space.save();
  };

  const handlePropose: starknet.Writer = async ({ txId, rawEvent, event }) => {
    if (!rawEvent || !event || !txId) return;

    logger.info('Handle propose');

    const spaceId = validateAndParseAddress(rawEvent.from_address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
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
        strategy => strategy === config.overrides.erc20VotesStrategy
      )
    ) {
      const minimumDelay = 10n * 60n;
      startTimestamp =
        startTimestamp > created + minimumDelay
          ? startTimestamp
          : created + minimumDelay;
      minEnd = minEnd > startTimestamp ? minEnd : startTimestamp;
    }

    const proposal = new Proposal(
      `${spaceId}/${proposalId}`,
      config.indexerName
    );
    proposal.link = getProposalLink({
      networkId: config.indexerName,
      spaceId,
      proposalId
    });
    proposal.proposal_id = proposalId.toString();
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
    proposal.type = 'basic';
    proposal.scores_1 = '0';
    proposal.scores_1_parsed = 0;
    proposal.scores_2 = '0';
    proposal.scores_2_parsed = 0;
    proposal.scores_3 = '0';
    proposal.scores_3_parsed = 0;
    proposal.scores_total = '0';
    proposal.quorum = '0';
    proposal.scores_total_parsed = 0;
    proposal.strategies_indices = space.strategies_indices;
    proposal.strategies = space.strategies;
    proposal.strategies_params = space.strategies_params;
    proposal.vp_decimals = space.vp_decimals;
    proposal.created = parseInt(created.toString());
    proposal.tx = txId;
    proposal.execution_tx = null;
    proposal.veto_tx = null;
    proposal.vote_count = 0;
    proposal.execution_ready = true;
    proposal.executed = false;
    proposal.vetoed = false;
    proposal.execution_settled = false;
    proposal.completed = false;
    proposal.cancelled = false;

    const executionStrategy = await handleExecutionStrategy(
      event.proposal.execution_strategy,
      event.payload,
      config
    );
    if (executionStrategy) {
      proposal.execution_strategy_type =
        executionStrategy.executionStrategyType;
      proposal.execution_destination = executionStrategy.destinationAddress;
      proposal.quorum = executionStrategy.quorum.toString();

      // Find matching strategy and persist it on space object
      // We use this on UI to properly display execution with treasury
      // information.
      // Current way of persisting it isn't great, because we need to fetch every strategy
      // for space and compare it with execution strategy address.
      // In the future we should find way to optimize it for example by adding where lookup
      // via ORM
      if (space.metadata) {
        const spaceMetadata = await SpaceMetadataItem.loadEntity(
          space.metadata,
          config.indexerName
        );

        if (spaceMetadata) {
          proposal.treasuries = spaceMetadata.treasuries;

          const strategies = await Promise.all(
            spaceMetadata.executors_strategies.map(id =>
              ExecutionStrategy.loadEntity(id, config.indexerName)
            )
          );

          const matchingStrategy = strategies.find(
            strategy => strategy?.address === proposal.execution_strategy
          );

          if (matchingStrategy) {
            proposal.execution_strategy_details = matchingStrategy.id;
          }
        }
      }
    }

    try {
      const metadataUri = longStringToText(event.metadata_uri);
      await handleProposalMetadata(
        'starknet',
        proposal.execution_strategy_type,
        proposal.execution_destination,
        proposal.execution_hash,
        metadataUri,
        config
      );

      proposal.metadata = dropIpfs(metadataUri);
    } catch (err) {
      logger.warn({ err }, 'Failed to handle proposal metadata');
    }

    const existingUser = await User.loadEntity(
      author.address,
      config.indexerName
    );
    if (existingUser) {
      existingUser.proposal_count += 1;
      await existingUser.save();
    } else {
      const user = new User(author.address, config.indexerName);
      user.address_type = author.type;
      user.created = parseInt(created.toString());
      await user.save();
    }

    let leaderboardItem = await Leaderboard.loadEntity(
      `${spaceId}/${author.address}`,
      config.indexerName
    );
    if (!leaderboardItem) {
      leaderboardItem = new Leaderboard(
        `${spaceId}/${author.address}`,
        config.indexerName
      );
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
        config.overrides.herodotusStrategies.includes(
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
        await registerProposal(
          {
            l1TokenAddress,
            strategyAddress: strategy,
            snapshotTimestamp: proposal.snapshot
          },
          config
        );
      } catch (err) {
        logger.warn({ err }, 'failed to register herodotus proposal');
      }
    }

    await Promise.all([
      updateCounter(config.indexerName, 'proposal_count', 1),
      proposal.save(),
      space.save()
    ]);
  };

  const handleCancel: starknet.Writer = async ({ rawEvent, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle cancel');

    const spaceId = validateAndParseAddress(rawEvent.from_address);
    const proposalId = `${spaceId}/${parseInt(event.proposal_id)}`;

    const [proposal, space] = await Promise.all([
      Proposal.loadEntity(proposalId, config.indexerName),
      Space.loadEntity(spaceId, config.indexerName)
    ]);
    if (!proposal || !space) return;

    proposal.cancelled = true;
    space.proposal_count -= 1;
    space.vote_count -= proposal.vote_count;

    await Promise.all([
      updateCounter(config.indexerName, 'proposal_count', -1),
      proposal.save(),
      space.save()
    ]);
  };

  const handleUpdate: starknet.Writer = async ({ block, rawEvent, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle update');

    const spaceId = validateAndParseAddress(rawEvent.from_address);
    const proposalId = `${spaceId}/${parseInt(event.proposal_id)}`;
    const metadataUri = longStringToText(event.metadata_uri);

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    proposal.execution_strategy = validateAndParseAddress(
      event.execution_strategy.address
    );
    proposal.execution_hash = hash.computeHashOnElements(
      event.execution_strategy.params
    );

    const executionStrategy = await handleExecutionStrategy(
      event.execution_strategy.address,
      event.payload,
      config
    );
    if (executionStrategy) {
      proposal.execution_strategy_type =
        executionStrategy.executionStrategyType;
      proposal.quorum = executionStrategy.quorum.toString();

      // Find matching strategy and persist it on space object
      // We use this on UI to properly display execution with treasury
      // information.
      // Current way of persisting it isn't great, because we need to fetch every strategy
      // for space and compare it with execution strategy address.
      // In the future we should find way to optimize it for example by adding where lookup
      // via ORM
      if (space.metadata) {
        const spaceMetadata = await SpaceMetadataItem.loadEntity(
          space.metadata,
          config.indexerName
        );

        if (spaceMetadata) {
          proposal.treasuries = spaceMetadata.treasuries;

          const strategies = await Promise.all(
            spaceMetadata.executors_strategies.map(id =>
              ExecutionStrategy.loadEntity(id, config.indexerName)
            )
          );

          const matchingStrategy = strategies.find(
            strategy => strategy?.address === proposal.execution_strategy
          );

          if (matchingStrategy) {
            proposal.execution_strategy_details = matchingStrategy.id;
          }
        }
      }
    }

    try {
      await handleProposalMetadata(
        'starknet',
        proposal.execution_strategy_type,
        proposal.execution_destination,
        proposal.execution_hash,
        metadataUri,
        config
      );

      proposal.metadata = dropIpfs(metadataUri);
      proposal.edited = block?.timestamp ?? getCurrentTimestamp();
    } catch (err) {
      logger.warn({ err }, 'Failed to handle proposal metadata');
    }

    await proposal.save();
  };

  const handleExecute: starknet.Writer = async ({ txId, rawEvent, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle execute');

    const spaceId = validateAndParseAddress(rawEvent.from_address);
    const proposalId = `${spaceId}/${parseInt(event.proposal_id)}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.executed = true;
    proposal.execution_settled = true;
    proposal.completed = true;
    proposal.execution_tx = txId ?? null;

    await proposal.save();
  };

  const handleVote: starknet.Writer = async ({
    block,
    txId,
    rawEvent,
    event
  }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle vote');

    const spaceId = validateAndParseAddress(rawEvent.from_address);
    const proposalId = parseInt(event.proposal_id);
    const choice = getVoteValue(findVariant(event.choice).key);
    const vp = BigInt(event.voting_power);

    const created = block?.timestamp ?? getCurrentTimestamp();
    const voter = formatAddressVariant(findVariant(event.voter));

    const proposal = await Proposal.loadEntity(
      `${spaceId}/${proposalId}`,
      config.indexerName
    );
    if (!proposal) return;

    const vote = new Vote(
      `${spaceId}/${proposalId}/${voter.address}`,
      config.indexerName
    );
    vote.space = spaceId;
    vote.proposal = proposalId.toString();
    vote.voter = voter.address;
    vote.choice = choice;
    vote.vp = vp.toString();
    vote.vp_parsed = getParsedVP(vp.toString(), proposal.vp_decimals);
    vote.created = created;
    vote.tx = txId;

    try {
      const metadataUri = longStringToText(event.metadata_uri);
      if (metadataUri) {
        await handleVoteMetadata(metadataUri, config);
        vote.metadata = dropIpfs(metadataUri);
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to handle vote metadata');
    }

    await vote.save();

    const existingUser = await User.loadEntity(
      voter.address,
      config.indexerName
    );
    if (existingUser) {
      existingUser.vote_count += 1;
      await existingUser.save();
    } else {
      const user = new User(voter.address, config.indexerName);
      user.address_type = voter.type;
      user.created = created;
      await user.save();
    }

    let leaderboardItem = await Leaderboard.loadEntity(
      `${spaceId}/${voter.address}`,
      config.indexerName
    );
    if (!leaderboardItem) {
      leaderboardItem = new Leaderboard(
        `${spaceId}/${voter.address}`,
        config.indexerName
      );
      leaderboardItem.space = spaceId;
      leaderboardItem.user = voter.address;
      leaderboardItem.vote_count = 0;
      leaderboardItem.proposal_count = 0;
    }

    leaderboardItem.vote_count += 1;
    await leaderboardItem.save();

    await updateCounter(config.indexerName, 'vote_count', 1);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (space) {
      space.vote_count += 1;
      if (leaderboardItem.vote_count === 1) space.voter_count += 1;

      await space.save();
    }

    proposal.vote_count += 1;
    proposal.scores_total = (
      BigInt(proposal.scores_total) + BigInt(vote.vp)
    ).toString();
    proposal.scores_total_parsed = getParsedVP(
      proposal.scores_total,
      proposal.vp_decimals
    );
    proposal[`scores_${choice}`] = (
      BigInt(proposal[`scores_${choice}`]) + BigInt(vote.vp)
    ).toString();
    proposal[`scores_${choice}_parsed`] = getParsedVP(
      proposal[`scores_${choice}`],
      proposal.vp_decimals
    );
    await proposal.save();
  };

  return {
    handleContractDeployed,
    handleSpaceCreated,
    handleMetadataUriUpdated,
    handleMinVotingDurationUpdated,
    handleMaxVotingDurationUpdated,
    handleOwnershipTransferred,
    handleVotingDelayUpdated,
    handleAuthenticatorsAdded,
    handleAuthenticatorsRemoved,
    handleVotingStrategiesAdded,
    handleVotingStrategiesRemoved,
    handleProposalValidationStrategyUpdated,
    handlePropose,
    handleCancel,
    handleUpdate,
    handleExecute,
    handleVote
  };
}
