import { defaultAbiCoder } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { keccak256 } from '@ethersproject/keccak256';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { evm } from '@snapshot-labs/checkpoint';
import AxiomExecutionStrategy from './abis/AxiomExecutionStrategy.json';
import SimpleQuorumAvatarExecutionStrategy from './abis/SimpleQuorumAvatarExecutionStrategy.json';
import SimpleQuorumTimelockExecutionStrategy from './abis/SimpleQuorumTimelockExecutionStrategy.json';
import { FullConfig } from './config';
import { handleSpaceMetadata } from './ipfs';
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

type Strategy = {
  addr: string;
  params: string;
};

export function createWriters(config: FullConfig) {
  const provider = new StaticJsonRpcProvider(
    config.network_node_url,
    config.chainId
  );

  const handleProxyDeployed: evm.Writer = async ({
    blockNumber,
    event,
    helpers: { executeTemplate }
  }) => {
    console.log('Handle contract deployed');

    if (!event) return;

    const proxyAddress = getAddress(event.args.proxy);
    const implementationAddress = getAddress(event.args.implementation);

    switch (implementationAddress) {
      case getAddress(config.overrides.masterSpace): {
        await executeTemplate('Space', {
          contract: proxyAddress,
          start: blockNumber
        });
        break;
      }
      case getAddress(config.overrides.masterSimpleQuorumTimelock): {
        const contract = new Contract(
          proxyAddress,
          SimpleQuorumTimelockExecutionStrategy,
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
        executionStrategy.treasury_chain = config.chainId;
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
      case getAddress(config.overrides.masterSimpleQuorumAvatar): {
        const contract = new Contract(
          proxyAddress,
          SimpleQuorumAvatarExecutionStrategy,
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
        executionStrategy.treasury_chain = config.chainId;
        executionStrategy.treasury = getAddress(target);
        executionStrategy.timelock_delay = 0n;

        await executionStrategy.save();

        await executeTemplate('SimpleQuorumAvatarExecutionStrategy', {
          contract: proxyAddress,
          start: blockNumber
        });

        break;
      }
      case config.overrides.masterAxiom
        ? getAddress(config.overrides.masterAxiom)
        : Symbol('never'): {
        const contract = new Contract(
          proxyAddress,
          AxiomExecutionStrategy,
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
        executionStrategy.treasury_chain = config.chainId;
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
        console.log('Unknown implementation', implementationAddress);
    }
  };

  const handleSpaceCreated: evm.Writer = async ({
    block,
    blockNumber,
    txId,
    event
  }) => {
    console.log('Handle space created');

    if (!event) return;

    const votingStrategies: Strategy[] = event.args.input.votingStrategies;

    const id = getAddress(event.args.space);

    const space = new Space(id, config.indexerName);
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
    space.strategies_metadata = event.args.input.votingStrategyMetadataURIs;
    space.strategies_decimals = [];
    space.vp_decimals = 0;
    space.authenticators = event.args.input.authenticators.map(
      (address: string) => getAddress(address)
    );
    space.proposal_count = 0;
    space.vote_count = 0;
    space.proposer_count = 0;
    space.voter_count = 0;
    space.created = block?.timestamp ?? getCurrentTimestamp();
    space.tx = txId;

    await updateProposalValidationStrategy(
      space,
      event.args.input.proposalValidationStrategy.addr,
      event.args.input.proposalValidationStrategy.params,
      event.args.input.proposalValidationStrategyMetadataURI,
      config
    );

    let spaceMetadataItem: SpaceMetadataItem | undefined;
    try {
      const metadataUri = event.args.input.metadataURI;
      spaceMetadataItem = await handleSpaceMetadata(
        space.id,
        metadataUri,
        config
      );

      space.metadata = dropIpfs(metadataUri);
    } catch (e) {
      console.log('failed to parse space metadata', e);
    }

    if (spaceMetadataItem) {
      for (const [i, executor] of spaceMetadataItem.executors.entries()) {
        const type = spaceMetadataItem.executors_types[i];

        if (type && !KNOWN_EXECUTION_STRATEGIES.includes(type)) {
          await handleCustomExecutionStrategy(
            executor,
            blockNumber,
            provider,
            config
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
    } catch (e) {
      console.log('failed to handle strategies metadata', e);
    }

    await updateCounter(config.indexerName, 'space_count', 1);

    await space.save();
  };

  const handleMetadataUriUpdated: evm.Writer = async ({
    blockNumber,
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space metadata uri updated');

    const spaceId = getAddress(rawEvent.address);

    let spaceMetadataItem: SpaceMetadataItem | undefined;
    try {
      const metadataUri = event.args.newMetadataURI;
      spaceMetadataItem = await handleSpaceMetadata(
        spaceId,
        metadataUri,
        config
      );

      const space = await Space.loadEntity(spaceId, config.indexerName);
      if (!space) return;

      space.metadata = dropIpfs(metadataUri);

      await space.save();
    } catch (e) {
      console.log('failed to update space metadata', e);
    }

    if (spaceMetadataItem) {
      for (const [i, executor] of spaceMetadataItem.executors.entries()) {
        const type = spaceMetadataItem.executors_types[i];

        if (type && !KNOWN_EXECUTION_STRATEGIES.includes(type)) {
          await handleCustomExecutionStrategy(
            executor,
            blockNumber,
            provider,
            config
          );
        }
      }
    }
  };

  const handleMinVotingDurationUpdated: evm.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space min voting duration updated');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.min_voting_period = Number(
      BigInt(event.args.newMinVotingDuration).toString()
    );

    await space.save();
  };

  const handleMaxVotingDurationUpdated: evm.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space max voting duration updated');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.max_voting_period = Number(
      BigInt(event.args.newMaxVotingDuration).toString()
    );

    await space.save();
  };

  const handleVotingDelayUpdated: evm.Writer = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space voting delay updated');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.voting_delay = Number(BigInt(event.args.newVotingDelay).toString());

    await space.save();
  };

  const handleOwnershipTransferred: evm.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space ownership transferred');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.controller = getAddress(event.args.newOwner);

    await space.save();
  };

  const handleAuthenticatorsAdded: evm.Writer = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space authenticators added');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.authenticators = [
      ...new Set([...space.authenticators, ...event.args.newAuthenticators])
    ];

    await space.save();
  };

  const handleAuthenticatorsRemoved: evm.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space authenticators removed');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    space.authenticators = space.authenticators.filter(
      authenticator => !event.args.authenticators.includes(authenticator)
    );

    await space.save();
  };

  const handleVotingStrategiesAdded: evm.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space voting strategies added');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    const initialNextStrategy = space.next_strategy_index;

    const strategies: string[] = event.args.newVotingStrategies.map(
      (strategy: Strategy) => strategy.addr
    );
    const strategiesParams = event.args.newVotingStrategies.map(
      (strategy: Strategy) => strategy.params
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
    } catch (e) {
      console.log('failed to handle strategies metadata', e);
    }

    await space.save();
  };

  const handleVotingStrategiesRemoved: evm.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space voting strategies removed');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    const indicesToRemove = event.args.votingStrategyIndices.map(
      (index: string) => space.strategies_indices.indexOf(parseInt(index))
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

  const handleProposalValidationStrategyUpdated: evm.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space proposal validation strategy updated');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    await updateProposalValidationStrategy(
      space,
      event.args.newProposalValidationStrategy.addr,
      event.args.newProposalValidationStrategy.params,
      event.args.newProposalValidationStrategyMetadataURI,
      config
    );

    await space.save();
  };

  const handleProposalCreated: evm.Writer = async ({
    rawEvent,
    event,
    txId,
    block
  }) => {
    if (!rawEvent || !event || !txId) return;

    console.log('Handle propose');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    const spaceMetadataItem = space.metadata
      ? await SpaceMetadataItem.loadEntity(space.metadata, config.indexerName)
      : null;

    const proposalId = event.args.proposalId.toNumber();
    const author = getAddress(event.args.author);
    const created = block?.timestamp ?? getCurrentTimestamp();

    const proposal = new Proposal(
      `${spaceId}/${proposalId}`,
      config.indexerName
    );
    proposal.link = getProposalLink({
      networkId: config.indexerName,
      spaceId,
      proposalId
    });
    proposal.proposal_id = proposalId;
    proposal.space = spaceId;
    proposal.author = author;
    proposal.metadata = null;
    proposal.execution_hash = event.args.proposal.executionPayloadHash;
    proposal.start = event.args.proposal.startBlockNumber;
    proposal.min_end = event.args.proposal.minEndBlockNumber;
    proposal.max_end = event.args.proposal.maxEndBlockNumber;
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
    } catch (e) {
      console.log(JSON.stringify(e).slice(0, 256));
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

    const apeGasStrategyAddress = config.overrides.apeGasStrategy;
    const apeGasStrategiesIndices = apeGasStrategyAddress
      ? space.strategies
          .map((strategy, i) => [strategy, i] as const)
          .filter(
            ([strategy]) => strategy === getAddress(apeGasStrategyAddress)
          )
      : [];

    if (apeGasStrategiesIndices.length) {
      proposal.start += config.overrides.apeGasStrategyDelay;
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
          config
        );
      } catch (e) {
        console.log('failed to decode ape gas strategy params', e);
        continue;
      }
    }

    await Promise.all([
      updateCounter(config.indexerName, 'proposal_count', 1),
      proposal.save(),
      space.save()
    ]);
  };

  const handleProposalCancelled: evm.Writer = async ({ rawEvent, event }) => {
    if (!rawEvent || !event) return;

    console.log('Handle cancel');

    const spaceId = getAddress(rawEvent.address);
    const proposalId = `${spaceId}/${parseInt(event.args.proposalId)}`;

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

  const handleProposalUpdated: evm.Writer = async ({
    block,
    rawEvent,
    event
  }) => {
    if (!rawEvent || !event) return;

    console.log('Handle update');

    const spaceId = getAddress(rawEvent.address);
    const proposalId = `${spaceId}/${parseInt(event.args.proposalId)}`;
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
      proposal.edited = block?.timestamp ?? getCurrentTimestamp();
    } catch (e) {
      console.log('failed to update proposal metadata', e);
    }

    await proposal.save();
  };

  const handleProposalExecuted: evm.Writer = async ({
    txId,
    rawEvent,
    event,
    block
  }) => {
    if (!rawEvent || !event) return;

    console.log('Handle execute');

    const spaceId = getAddress(rawEvent.address);
    const proposalId = `${spaceId}/${parseInt(event.args.proposalId)}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.executed = true;

    const executionStrategy = await ExecutionStrategy.loadEntity(
      proposal.execution_strategy,
      config.indexerName
    );

    const now = block?.timestamp ?? getCurrentTimestamp();

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

  const handleVoteCast: evm.Writer = async ({
    block,
    txId,
    rawEvent,
    event
  }) => {
    if (!rawEvent || !event) return;

    console.log('Handle vote');

    const spaceId = getAddress(rawEvent.address);
    const proposalId = parseInt(event.args.proposalId);
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

    const created = block?.timestamp ?? getCurrentTimestamp();

    const voter = getAddress(event.args.voter);

    const vote = new Vote(
      `${spaceId}/${proposalId}/${voter}`,
      config.indexerName
    );
    vote.space = spaceId;
    vote.proposal = proposalId;
    vote.voter = voter;
    vote.choice = choice;
    vote.vp = vp.toString();
    vote.vp_parsed = getParsedVP(vp.toString(), proposal.vp_decimals);
    vote.created = created;
    vote.tx = txId;

    if (event.args.metadataUri) {
      try {
        const metadataUri = event.args.metadataUri;
        await handleVoteMetadata(metadataUri, config);

        vote.metadata = dropIpfs(metadataUri);
      } catch (e) {
        console.log(JSON.stringify(e).slice(0, 256));
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

  const handleTimelockProposalExecuted: evm.Writer = async ({
    txId,
    rawEvent,
    event
  }) => {
    if (!rawEvent || !event) return;

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

  const handleTimelockProposalVetoed: evm.Writer = async ({
    txId,
    rawEvent,
    event
  }) => {
    if (!rawEvent || !event) return;

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

  const handleAxiomWriteOffchainVotes: evm.Writer = async ({
    rawEvent,
    blockNumber,
    event
  }) => {
    if (!rawEvent || !event) return;

    const contract = new Contract(
      rawEvent.address,
      AxiomExecutionStrategy,
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

  const handleL1AvatarExecutionContractDeployed: evm.Writer = async ({
    blockNumber,
    event,
    helpers: { executeTemplate }
  }) => {
    console.log('Handle contract deployed');

    if (!event) return;

    const contractAddress = getAddress(event.args.contractAddress);

    await executeTemplate('L1AvatarExecutionStrategy', {
      contract: contractAddress,
      start: blockNumber
    });
  };

  const handleStarknetProposalExecuted: evm.Writer = async ({
    block,
    txId,
    event
  }) => {
    if (!event) return;

    const rawSpace: BigNumber = event.args.space;
    const rawProposalId: BigNumber = event.args.proposalId;

    const space = rawSpace.toHexString();
    const paddedSpace = `0x${space.replace('0x', '').padStart(64, '0')}`;
    const proposalId = rawProposalId.toNumber();

    const executionEntity = new StarknetL1Execution(
      `${paddedSpace}/${proposalId}`,
      config.indexerName
    );
    executionEntity.space = paddedSpace;
    executionEntity.proposalId = proposalId;
    executionEntity.created = block?.timestamp ?? getCurrentTimestamp();
    executionEntity.tx = txId;
    await executionEntity.save();
  };

  const handleQuorumUpdated: evm.Writer = async ({ rawEvent, event }) => {
    if (!rawEvent || !event) return;

    console.log('Handle QuorumUpdated');

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
    // Axiom
    handleAxiomWriteOffchainVotes,
    // L1AvatarExecutionStrategyFactory
    handleL1AvatarExecutionContractDeployed,
    // L1AvatarExecutionStrategy
    handleStarknetProposalExecuted,
    // SimpleQuorumAvatarExecutionStrategy
    handleQuorumUpdated
  };
}
