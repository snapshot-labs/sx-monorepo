import { defaultAbiCoder } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { evm } from '@snapshot-labs/checkpoint';
import { getAddress, keccak256 } from 'viem';
import AxiomExecutionStrategyAbi from './abis/AxiomExecutionStrategy';
import L1AvatarExecutionStrategyAbi from './abis/L1AvatarExecutionStrategy';
import L1AvatarExecutionStrategyFactoryAbi from './abis/L1AvatarExecutionStrategyFactory';
import ProxyFactoryAbi from './abis/ProxyFactory';
import SimpleQuorumAvatarExecutionStrategyAbi from './abis/SimpleQuorumAvatarExecutionStrategy.json';
import SimpleQuorumTimelockExecutionStrategyAbi from './abis/SimpleQuorumTimelockExecutionStrategy';
import SpaceAbi from './abis/Space';
import { handleSpaceMetadata } from './ipfs';
import logger from './logger';
import {
  convertChoice,
  handleCustomExecutionStrategy,
  registerApeGasProposal,
  updateProposalValidationStrategy
} from './utils';
import {
  ExecutionHash,
  ExecutionStrategy,
  Leaderboard,
  Proposal,
  Space,
  SpaceMetadataItem,
  StarknetL1Execution,
  User,
  Vote
} from '../../../../.checkpoint/models';
import {
  handleProposalMetadata,
  handleStrategiesMetadata,
  handleVoteMetadata
} from '../../../common/ipfs';
import {
  dropIpfs,
  getCurrentTimestamp,
  getParsedVP,
  getProposalLink,
  getSpaceDecimals,
  getSpaceLink,
  updateCounter
} from '../../../common/utils';
import { EVMConfig, SnapshotXConfig } from '../../types';
import { getTimestampFromBlock as _getTimestampFromBlock } from '../../utils';

/**
 * List of execution strategies type that are known and we expect them to be deployed via factory.
 * Other execution strategies will be treated as custom execution and will be resolved once
 * they are added to space.
 */
const KNOWN_EXECUTION_STRATEGIES = [
  'SimpleQuorumAvatar',
  'SimpleQuorumTimelock',
  'Axiom',
  'Isokratia'
];

const EMPTY_EXECUTION_HASH =
  '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';

export function createWriters(
  config: EVMConfig,
  protocolConfig: SnapshotXConfig
) {
  const provider = new StaticJsonRpcProvider(
    config.network_node_url,
    protocolConfig.chainId
  );

  const handleProxyDeployed: evm.Writer<
    typeof ProxyFactoryAbi,
    'ProxyDeployed'
  > = async ({ blockNumber, event, helpers: { executeTemplate } }) => {
    if (!event) return;

    logger.info('Handle contract deployed');

    const proxyAddress = getAddress(event.args.proxy);
    const implementationAddress = getAddress(event.args.implementation);

    switch (implementationAddress) {
      case getAddress(protocolConfig.masterSpace): {
        await executeTemplate('Space', {
          contract: proxyAddress,
          start: blockNumber
        });
        break;
      }
      case getAddress(protocolConfig.masterSimpleQuorumTimelock): {
        const contract = new Contract(
          proxyAddress,
          SimpleQuorumTimelockExecutionStrategyAbi,
          provider
        );

        const overrides = {
          blockTag: blockNumber
        };

        const [type, quorum, timelockVetoGuardian, timelockDelay]: [
          string,
          BigNumber,
          string,
          BigNumber
        ] = await Promise.all([
          contract.getStrategyType(overrides),
          contract.quorum(overrides),
          contract.vetoGuardian(overrides),
          contract.timelockDelay(overrides)
        ]);

        const executionStrategy = new ExecutionStrategy(
          proxyAddress,
          config.indexerName
        );
        executionStrategy.address = proxyAddress;
        executionStrategy.type = type;
        executionStrategy.quorum = quorum.toString();
        executionStrategy.treasury_chain = protocolConfig.chainId;
        executionStrategy.treasury = proxyAddress;
        executionStrategy.timelock_veto_guardian =
          getAddress(timelockVetoGuardian);
        executionStrategy.timelock_delay = timelockDelay.toBigInt();

        await executionStrategy.save();

        await executeTemplate('SimpleQuorumTimelockExecutionStrategy', {
          contract: proxyAddress,
          start: blockNumber
        });

        break;
      }
      case getAddress(protocolConfig.masterSimpleQuorumAvatar): {
        const contract = new Contract(
          proxyAddress,
          SimpleQuorumAvatarExecutionStrategyAbi,
          provider
        );

        const overrides = {
          blockTag: blockNumber
        };

        const [type, quorum, target]: [string, BigNumber, string] =
          await Promise.all([
            contract.getStrategyType(overrides),
            contract.quorum(overrides),
            contract.target(overrides)
          ]);

        const executionStrategy = new ExecutionStrategy(
          proxyAddress,
          config.indexerName
        );
        executionStrategy.address = proxyAddress;
        executionStrategy.type = type;
        executionStrategy.quorum = quorum.toString();
        executionStrategy.treasury_chain = protocolConfig.chainId;
        executionStrategy.treasury = getAddress(target);
        executionStrategy.timelock_delay = 0n;

        await executionStrategy.save();

        await executeTemplate('SimpleQuorumAvatarExecutionStrategy', {
          contract: proxyAddress,
          start: blockNumber
        });

        break;
      }
      case protocolConfig.masterAxiom
        ? getAddress(protocolConfig.masterAxiom)
        : Symbol('never'): {
        const contract = new Contract(
          proxyAddress,
          AxiomExecutionStrategyAbi,
          provider
        );

        const overrides = {
          blockTag: blockNumber
        };

        const quorum: BigNumber = await contract.quorum(overrides);

        const executionStrategy = new ExecutionStrategy(
          proxyAddress,
          config.indexerName
        );
        executionStrategy.address = proxyAddress;
        executionStrategy.type = 'Axiom'; // override because contract returns AxiomExecutionStrategyMock
        executionStrategy.quorum = quorum.toString();
        executionStrategy.treasury_chain = protocolConfig.chainId;
        executionStrategy.treasury = proxyAddress;
        executionStrategy.timelock_delay = 0n;

        await executionStrategy.save();

        await executeTemplate('AxiomExecutionStrategy', {
          contract: proxyAddress,
          start: blockNumber
        });

        break;
      }
      default:
        logger.warn(
          { address: implementationAddress },
          'Unknown implementation'
        );
    }
  };

  const handleSpaceCreated: evm.Writer<
    typeof SpaceAbi,
    'SpaceCreated'
  > = async ({ block, blockNumber, txId, event }) => {
    if (!event) return;

    logger.info('Handle space created');

    const id = getAddress(event.args.space);
    const { votingStrategies } = event.args.input;

    const space = new Space(id, config.indexerName);
    space.protocol = 'snapshot-x';
    space.link = getSpaceLink({
      networkId: config.indexerName,
      spaceId: id
    });
    space.verified = false;
    space.turbo = false;
    space.metadata = null;
    space.controller = getAddress(event.args.input.owner);
    space.voting_delay = event.args.input.votingDelay;
    space.min_voting_period = event.args.input.minVotingDuration;
    space.max_voting_period = event.args.input.maxVotingDuration;
    space.proposal_threshold = '0';
    space.strategies_indices = votingStrategies.map((_, i) => i);
    space.strategies = votingStrategies.map(s => getAddress(s.addr));
    space.next_strategy_index = votingStrategies.length;
    space.strategies_params = votingStrategies.map(s => s.params);
    space.strategies_metadata = [
      ...event.args.input.votingStrategyMetadataURIs
    ];
    space.strategies_decimals = [];
    space.vp_decimals = 0;
    space.authenticators = event.args.input.authenticators.map(
      (address: string) => getAddress(address)
    );
    space.proposal_count = 0;
    space.vote_count = 0;
    space.proposer_count = 0;
    space.voter_count = 0;
    space.created = Number(block?.timestamp ?? getCurrentTimestamp());
    space.tx = txId;

    await updateProposalValidationStrategy(
      space,
      event.args.input.proposalValidationStrategy.addr,
      event.args.input.proposalValidationStrategy.params,
      event.args.input.proposalValidationStrategyMetadataURI,
      config,
      protocolConfig
    );

    let spaceMetadataItem: SpaceMetadataItem | undefined;
    try {
      const metadataUri = event.args.input.metadataURI;
      spaceMetadataItem = await handleSpaceMetadata(
        space.id,
        metadataUri,
        config.indexerName
      );

      space.metadata = dropIpfs(metadataUri);
    } catch (err) {
      logger.info({ err }, 'Failed to fetch space metadata');
    }

    if (spaceMetadataItem) {
      for (const [i, executor] of spaceMetadataItem.executors.entries()) {
        const type = spaceMetadataItem.executors_types[i];

        if (type && !KNOWN_EXECUTION_STRATEGIES.includes(type)) {
          await handleCustomExecutionStrategy(
            executor,
            blockNumber,
            provider,
            config,
            protocolConfig
          );
        }
      }
    }

    try {
      const { strategiesDecimals } = await handleStrategiesMetadata(
        space.id,
        space.strategies_metadata,
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

  const handleMetadataUriUpdated: evm.Writer<
    typeof SpaceAbi,
    'MetadataURIUpdated'
  > = async ({ blockNumber, rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space metadata uri updated');

    const spaceId = getAddress(rawEvent.address);

    let spaceMetadataItem: SpaceMetadataItem | undefined;
    try {
      const metadataUri = event.args.newMetadataURI;
      spaceMetadataItem = await handleSpaceMetadata(
        spaceId,
        metadataUri,
        config.indexerName
      );

      const space = await Space.loadEntity(spaceId, config.indexerName);
      if (!space) return;

      space.metadata = dropIpfs(metadataUri);

      await space.save();
    } catch (err) {
      logger.info({ err }, 'Failed to fetch space metadata');
    }

    if (spaceMetadataItem) {
      for (const [i, executor] of spaceMetadataItem.executors.entries()) {
        const type = spaceMetadataItem.executors_types[i];

        if (type && !KNOWN_EXECUTION_STRATEGIES.includes(type)) {
          await handleCustomExecutionStrategy(
            executor,
            blockNumber,
            provider,
            config,
            protocolConfig
          );
        }
      }
    }
  };

  const handleMinVotingDurationUpdated: evm.Writer<
    typeof SpaceAbi,
    'MinVotingDurationUpdated'
  > = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space min voting duration updated');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.min_voting_period = event.args.newMinVotingDuration;

    await space.save();
  };

  const handleMaxVotingDurationUpdated: evm.Writer<
    typeof SpaceAbi,
    'MaxVotingDurationUpdated'
  > = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space max voting duration updated');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.max_voting_period = event.args.newMaxVotingDuration;

    await space.save();
  };

  const handleVotingDelayUpdated: evm.Writer<
    typeof SpaceAbi,
    'VotingDelayUpdated'
  > = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space voting delay updated');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.voting_delay = event.args.newVotingDelay;

    await space.save();
  };

  const handleOwnershipTransferred: evm.Writer<
    typeof SpaceAbi,
    'OwnershipTransferred'
  > = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space ownership transferred');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.controller = getAddress(event.args.newOwner);

    await space.save();
  };

  const handleAuthenticatorsAdded: evm.Writer<
    typeof SpaceAbi,
    'AuthenticatorsAdded'
  > = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space authenticators added');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.authenticators = [
      ...new Set([...space.authenticators, ...event.args.newAuthenticators])
    ];

    await space.save();
  };

  const handleAuthenticatorsRemoved: evm.Writer<
    typeof SpaceAbi,
    'AuthenticatorsRemoved'
  > = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space authenticators removed');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    const authenticatorsToRemove: string[] = [...event.args.authenticators];

    space.authenticators = space.authenticators.filter(
      authenticator => !authenticatorsToRemove.includes(authenticator)
    );

    await space.save();
  };

  const handleVotingStrategiesAdded: evm.Writer<
    typeof SpaceAbi,
    'VotingStrategiesAdded'
  > = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space voting strategies added');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    const initialNextStrategy = space.next_strategy_index;

    const strategies = event.args.newVotingStrategies.map(
      strategy => strategy.addr
    );
    const strategiesParams = event.args.newVotingStrategies.map(
      strategy => strategy.params
    );
    const strategiesMetadataUris = event.args.newVotingStrategyMetadataURIs;

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

  const handleVotingStrategiesRemoved: evm.Writer<
    typeof SpaceAbi,
    'VotingStrategiesRemoved'
  > = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space voting strategies removed');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    const indicesToRemove = event.args.votingStrategyIndices.map(index =>
      space.strategies_indices.indexOf(index)
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

  const handleProposalValidationStrategyUpdated: evm.Writer<
    typeof SpaceAbi,
    'ProposalValidationStrategyUpdated'
  > = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle space proposal validation strategy updated');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    await updateProposalValidationStrategy(
      space,
      event.args.newProposalValidationStrategy.addr,
      event.args.newProposalValidationStrategy.params,
      event.args.newProposalValidationStrategyMetadataURI,
      config,
      protocolConfig
    );

    await space.save();
  };

  const handleProposalCreated: evm.Writer<
    typeof SpaceAbi,
    'ProposalCreated'
  > = async ({ rawEvent, event, txId, block, blockNumber }) => {
    if (!rawEvent || !event || !txId) return;

    logger.info('Handle proposal created');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    const spaceMetadataItem = space.metadata
      ? await SpaceMetadataItem.loadEntity(space.metadata, config.indexerName)
      : null;

    const proposalId = event.args.proposalId;
    const author = getAddress(event.args.author);
    const created = Number(block?.timestamp ?? getCurrentTimestamp());

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
    proposal.author = author;
    proposal.metadata = null;
    proposal.execution_hash = event.args.proposal.executionPayloadHash;

    const getTimestampFromBlock = (value: number) =>
      _getTimestampFromBlock({
        networkId: config.indexerName,
        blockNumber: value,
        currentBlockNumber: blockNumber,
        currentTimestamp: created,
        provider
      });

    proposal.start = await getTimestampFromBlock(
      event.args.proposal.startBlockNumber
    );
    proposal.start_block_number = event.args.proposal.startBlockNumber;
    proposal.min_end = await getTimestampFromBlock(
      event.args.proposal.minEndBlockNumber
    );
    proposal.min_end_block_number = event.args.proposal.minEndBlockNumber;
    proposal.max_end = await getTimestampFromBlock(
      event.args.proposal.maxEndBlockNumber
    );
    proposal.max_end_block_number = event.args.proposal.maxEndBlockNumber;
    proposal.snapshot = event.args.proposal.startBlockNumber;
    proposal.type = 'basic';
    proposal.scores_1 = '0';
    proposal.scores_1_parsed = 0;
    proposal.scores_2 = '0';
    proposal.scores_2_parsed = 0;
    proposal.scores_3 = '0';
    proposal.scores_3_parsed = 0;
    proposal.scores_total = '0';
    proposal.scores_total_parsed = 0;
    proposal.quorum = '0';
    proposal.strategies_indices = space.strategies_indices;
    proposal.strategies = space.strategies;
    proposal.strategies_params = space.strategies_params;
    proposal.vp_decimals = space.vp_decimals;
    proposal.created = created;
    proposal.tx = txId;
    proposal.execution_tx = null;
    proposal.veto_tx = null;
    proposal.vote_count = 0;

    proposal.treasuries = spaceMetadataItem?.treasuries ?? [];
    proposal.execution_strategy = getAddress(
      event.args.proposal.executionStrategy
    );
    proposal.execution_time = 0;
    proposal.executed = false;
    proposal.vetoed = false;
    proposal.execution_settled = false;
    proposal.completed = false;
    proposal.cancelled = false;

    const executionStrategy = await ExecutionStrategy.loadEntity(
      proposal.execution_strategy,
      config.indexerName
    );

    if (executionStrategy) {
      proposal.quorum = executionStrategy.quorum.toString();
      proposal.timelock_veto_guardian =
        executionStrategy.timelock_veto_guardian;
      proposal.timelock_delay = executionStrategy.timelock_delay;
      proposal.axiom_snapshot_address =
        executionStrategy.axiom_snapshot_address;
      proposal.axiom_snapshot_slot = executionStrategy.axiom_snapshot_slot;
      proposal.execution_strategy_type = executionStrategy.type;

      // Find matching strategy and persist it on space object
      // We use this on UI to properly display execution with treasury
      // information.
      proposal.execution_strategy_details = executionStrategy.id;
    } else {
      proposal.quorum = '0';
      proposal.timelock_veto_guardian = null;
      proposal.timelock_delay = 0n;
      proposal.execution_strategy_type = 'none';
    }

    proposal.execution_ready = proposal.execution_strategy_type != 'Axiom';

    if (proposal.execution_hash !== EMPTY_EXECUTION_HASH) {
      let executionHash = await ExecutionHash.loadEntity(
        proposal.execution_hash,
        config.indexerName
      );

      if (!executionHash) {
        executionHash = new ExecutionHash(
          proposal.execution_hash,
          config.indexerName
        );
        executionHash.proposal_id = `${spaceId}/${proposalId}`;
        await executionHash.save();
      }
    }

    try {
      const metadataUri = event.args.metadataUri;
      await handleProposalMetadata(
        'evm',
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

    const existingUser = await User.loadEntity(author, config.indexerName);
    if (existingUser) {
      existingUser.proposal_count += 1;
      await existingUser.save();
    } else {
      const user = new User(author, config.indexerName);
      user.address_type = 1;
      user.created = created;
      await user.save();
    }

    let leaderboardItem = await Leaderboard.loadEntity(
      `${spaceId}/${author}`,
      config.indexerName
    );
    if (!leaderboardItem) {
      leaderboardItem = new Leaderboard(
        `${spaceId}/${author}`,
        config.indexerName
      );
      leaderboardItem.space = spaceId;
      leaderboardItem.user = author;
      leaderboardItem.vote_count = 0;
      leaderboardItem.proposal_count = 0;
    }

    leaderboardItem.proposal_count += 1;
    await leaderboardItem.save();

    if (leaderboardItem.proposal_count === 1) space.proposer_count += 1;
    space.proposal_count += 1;

    const apeGasStrategyAddress = protocolConfig.apeGasStrategy;
    const apeGasStrategiesIndices = apeGasStrategyAddress
      ? space.strategies
          .map((strategy, i) => [strategy, i] as const)
          .filter(
            ([strategy]) => strategy === getAddress(apeGasStrategyAddress)
          )
      : [];

    if (apeGasStrategiesIndices.length) {
      proposal.start += protocolConfig.apeGasStrategyDelay;
      proposal.min_end = Math.max(proposal.start, proposal.min_end);
    }

    for (const [, i] of apeGasStrategiesIndices) {
      const params = space.strategies_params[i];
      if (!params) continue;

      try {
        const [, , , , viewId] = defaultAbiCoder.decode(
          ['uint256', 'uint256', 'address', 'address', 'bytes32', 'address'],
          params
        );

        await registerApeGasProposal(
          {
            viewId,
            snapshot: proposal.snapshot
          },
          protocolConfig
        );
      } catch (err) {
        logger.warn({ err }, 'Failed to decode ape gas strategy params');
        continue;
      }
    }

    await Promise.all([
      updateCounter(config.indexerName, 'proposal_count', 1),
      proposal.save(),
      space.save()
    ]);
  };

  const handleProposalCancelled: evm.Writer<
    typeof SpaceAbi,
    'ProposalCancelled'
  > = async ({ rawEvent, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle proposal cancelled');

    const spaceId = getAddress(rawEvent.address);
    const proposalId = `${spaceId}/${event.args.proposalId}`;

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

  const handleProposalUpdated: evm.Writer<
    typeof SpaceAbi,
    'ProposalUpdated'
  > = async ({ block, rawEvent, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle proposal updated');

    const spaceId = getAddress(rawEvent.address);
    const proposalId = `${spaceId}/${event.args.proposalId}`;
    const metadataUri = event.args.newMetadataURI;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.execution_strategy = getAddress(
      event.args.newExecutionStrategy.addr
    );
    proposal.execution_hash = keccak256(event.args.newExecutionStrategy.params);

    const executionStrategy = await ExecutionStrategy.loadEntity(
      proposal.execution_strategy,
      config.indexerName
    );
    if (executionStrategy) {
      proposal.quorum = executionStrategy.quorum.toString();
      proposal.timelock_veto_guardian =
        executionStrategy.timelock_veto_guardian;
      proposal.timelock_delay = executionStrategy.timelock_delay;
      proposal.axiom_snapshot_address =
        executionStrategy.axiom_snapshot_address;
      proposal.axiom_snapshot_slot = executionStrategy.axiom_snapshot_slot;
      proposal.execution_strategy_type = executionStrategy.type;

      // Find matching strategy and persist it on space object
      // We use this on UI to properly display execution with treasury
      // information.
      proposal.execution_strategy_details = executionStrategy.id;
    } else {
      proposal.quorum = '0';
      proposal.timelock_veto_guardian = null;
      proposal.timelock_delay = 0n;
      proposal.execution_strategy_type = 'none';
    }

    proposal.execution_ready = proposal.execution_strategy_type != 'Axiom';

    if (proposal.execution_hash !== EMPTY_EXECUTION_HASH) {
      let executionHash = await ExecutionHash.loadEntity(
        proposal.execution_hash,
        config.indexerName
      );

      if (!executionHash) {
        executionHash = new ExecutionHash(
          proposal.execution_hash,
          config.indexerName
        );
        executionHash.proposal_id = `${spaceId}/${proposalId}`;
        await executionHash.save();
      }
    }

    try {
      await handleProposalMetadata(
        'evm',
        proposal.execution_strategy_type,
        proposal.execution_destination,
        proposal.execution_hash,
        metadataUri,
        config
      );

      proposal.metadata = dropIpfs(metadataUri);
      proposal.edited = Number(block?.timestamp ?? getCurrentTimestamp());
    } catch (err) {
      logger.warn({ err }, 'Failed to handle proposal metadata');
    }

    await proposal.save();
  };

  const handleProposalExecuted: evm.Writer<
    typeof SpaceAbi,
    'ProposalExecuted'
  > = async ({ txId, rawEvent, event, block }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle proposal executed');

    const spaceId = getAddress(rawEvent.address);
    const proposalId = `${spaceId}/${event.args.proposalId}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.executed = true;

    const executionStrategy = await ExecutionStrategy.loadEntity(
      proposal.execution_strategy,
      config.indexerName
    );

    const now = Number(block?.timestamp ?? getCurrentTimestamp());

    if (executionStrategy) {
      switch (executionStrategy.type) {
        case 'SimpleQuorumAvatar':
        case 'Axiom':
          proposal.execution_settled = true;
          proposal.completed = true;
          proposal.execution_tx = txId;
          break;
        case 'SimpleQuorumTimelock':
          proposal.execution_time =
            now + Number(executionStrategy.timelock_delay);
          break;
      }
    }

    await proposal.save();
  };

  const handleVoteCast: evm.Writer<
    typeof SpaceAbi,
    'VoteCast' | 'VoteCastWithMetadata'
  > = async ({ block, txId, rawEvent, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle vote cast');

    const spaceId = getAddress(rawEvent.address);
    const proposalId = event.args.proposalId;
    const choice = convertChoice(event.args.choice);
    const vp = event.args.votingPower;

    if (!choice) {
      // Unknown choice value, ignoring vote
      return;
    }

    const proposal = await Proposal.loadEntity(
      `${spaceId}/${proposalId}`,
      config.indexerName
    );
    if (!proposal) return;

    const created = Number(block?.timestamp ?? getCurrentTimestamp());

    const voter = getAddress(event.args.voter);

    const vote = new Vote(
      `${spaceId}/${proposalId}/${voter}`,
      config.indexerName
    );
    vote.space = spaceId;
    vote.proposal = proposalId.toString();
    vote.voter = voter;
    vote.choice = choice;
    vote.vp = vp.toString();
    vote.vp_parsed = getParsedVP(vp.toString(), proposal.vp_decimals);
    vote.created = created;
    vote.tx = txId;

    if ('metadataUri' in event.args) {
      try {
        const metadataUri = event.args.metadataUri;
        await handleVoteMetadata(metadataUri, config);

        vote.metadata = dropIpfs(metadataUri);
      } catch (err) {
        logger.info({ err }, 'Failed to handle vote metadata');
      }
    }

    await vote.save();

    const existingUser = await User.loadEntity(voter, config.indexerName);
    if (existingUser) {
      existingUser.vote_count += 1;
      await existingUser.save();
    } else {
      const user = new User(voter, config.indexerName);
      user.address_type = 1;
      user.created = created;
      await user.save();
    }

    let leaderboardItem = await Leaderboard.loadEntity(
      `${spaceId}/${voter}`,
      config.indexerName
    );
    if (!leaderboardItem) {
      leaderboardItem = new Leaderboard(
        `${spaceId}/${voter}`,
        config.indexerName
      );
      leaderboardItem.space = spaceId;
      leaderboardItem.user = voter;
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

  const handleTimelockProposalExecuted: evm.Writer<
    typeof SimpleQuorumTimelockExecutionStrategyAbi,
    'ProposalExecuted'
  > = async ({ txId, rawEvent, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle timelock proposal executed');

    const executionHash = await ExecutionHash.loadEntity(
      event.args.executionPayloadHash,
      config.indexerName
    );
    if (!executionHash) return;

    const proposal = await Proposal.loadEntity(
      executionHash.proposal_id,
      config.indexerName
    );
    if (!proposal) return;

    proposal.execution_settled = true;
    proposal.completed = true;
    proposal.execution_tx = txId;
    await proposal.save();
  };

  const handleTimelockProposalVetoed: evm.Writer<
    typeof SimpleQuorumTimelockExecutionStrategyAbi,
    'ProposalVetoed'
  > = async ({ txId, rawEvent, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle timelock proposal vetoed');

    const executionHash = await ExecutionHash.loadEntity(
      event.args.executionPayloadHash,
      config.indexerName
    );
    if (!executionHash) return;

    const proposal = await Proposal.loadEntity(
      executionHash.proposal_id,
      config.indexerName
    );
    if (!proposal) return;

    proposal.execution_settled = true;
    proposal.completed = true;
    proposal.vetoed = true;
    proposal.veto_tx = txId;
    await proposal.save();
  };

  const handleQuorumUpdated: evm.Writer<
    typeof SimpleQuorumTimelockExecutionStrategyAbi,
    'QuorumUpdated'
  > = async ({ rawEvent, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle quorum updated');

    const executionStrategyAddress = getAddress(rawEvent.address);

    const executionStrategy = await ExecutionStrategy.loadEntity(
      executionStrategyAddress,
      config.indexerName
    );

    if (executionStrategy) {
      executionStrategy.quorum = event.args.newQuorum.toString();
      await executionStrategy.save();
    }
  };

  const handleAxiomWriteOffchainVotes: evm.Writer<
    typeof AxiomExecutionStrategyAbi,
    'WriteOffchainVotes'
  > = async ({ rawEvent, blockNumber, event }) => {
    if (!rawEvent || !event) return;

    logger.info('Handle axiom write offchain votes');

    const contract = new Contract(
      rawEvent.address,
      AxiomExecutionStrategyAbi,
      provider
    );

    const overrides = {
      blockTag: blockNumber
    };

    const space: string = await contract.space(overrides);
    const spaceId = getAddress(space);

    const proposal = await Proposal.loadEntity(
      `${spaceId}/${event.args.proposalId}`,
      config.indexerName
    );
    if (!proposal) return;

    proposal.execution_ready = true;

    proposal.save();
  };

  const handleL1AvatarExecutionContractDeployed: evm.Writer<
    typeof L1AvatarExecutionStrategyFactoryAbi,
    'ContractDeployed'
  > = async ({ blockNumber, event, helpers: { executeTemplate } }) => {
    if (!event) return;

    logger.info('Handle L1AvatarExecutionStrategy contract deployed');

    const contractAddress = getAddress(event.args.contractAddress);

    await executeTemplate('L1AvatarExecutionStrategy', {
      contract: contractAddress,
      start: blockNumber
    });
  };

  const handleStarknetProposalExecuted: evm.Writer<
    typeof L1AvatarExecutionStrategyAbi,
    'ProposalExecuted'
  > = async ({ block, txId, event }) => {
    if (!event) return;

    logger.info('Handle starknet proposal executed');

    const space = event.args.space.toString(16);
    const paddedSpace = `0x${space.replace('0x', '').padStart(64, '0')}`;
    const proposalId = Number(event.args.proposalId);

    const executionEntity = new StarknetL1Execution(
      `${paddedSpace}/${proposalId}`,
      config.indexerName
    );
    executionEntity.space = paddedSpace;
    executionEntity.proposalId = proposalId;
    executionEntity.created = Number(block?.timestamp ?? getCurrentTimestamp());
    executionEntity.tx = txId;
    await executionEntity.save();
  };

  return {
    // ProxyFactory
    handleProxyDeployed,
    // Space
    handleSpaceCreated,
    handleMetadataUriUpdated,
    handleMinVotingDurationUpdated,
    handleMaxVotingDurationUpdated,
    handleVotingDelayUpdated,
    handleOwnershipTransferred,
    handleAuthenticatorsAdded,
    handleAuthenticatorsRemoved,
    handleVotingStrategiesAdded,
    handleVotingStrategiesRemoved,
    handleProposalValidationStrategyUpdated,
    handleProposalCreated,
    handleProposalCancelled,
    handleProposalUpdated,
    handleProposalExecuted,
    handleVoteCast,
    // SimpleQuorumTimelockExecutionStrategy
    handleTimelockProposalExecuted,
    handleTimelockProposalVetoed,
    handleQuorumUpdated,
    // Axiom
    handleAxiomWriteOffchainVotes,
    // L1AvatarExecutionStrategyFactory
    handleL1AvatarExecutionContractDeployed,
    // L1AvatarExecutionStrategy
    handleStarknetProposalExecuted
  };
}
