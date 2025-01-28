import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { evm } from '@snapshot-labs/checkpoint';
import AxiomExecutionStrategy from './abis/AxiomExecutionStrategy.json';
import SimpleQuorumAvatarExecutionStrategy from './abis/SimpleQuorumAvatarExecutionStrategy.json';
import SimpleQuorumTimelockExecutionStrategy from './abis/SimpleQuorumTimelockExecutionStrategy.json';
import { FullConfig } from './config';
import { handleSpaceMetadata } from './ipfs';
import { convertChoice, updateProposaValidationStrategy } from './utils';
import {
  ExecutionHash,
  ExecutionStrategy,
  Leaderboard,
  Proposal,
  Space,
  User,
  Vote
} from '../../.checkpoint/models';
import {
  handleProposalMetadata,
  handleStrategiesMetadata,
  handleVoteMetadata
} from '../common/ipfs';
import { dropIpfs, getCurrentTimestamp } from '../common/utils';

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

  const handleSpaceCreated: evm.Writer = async ({ block, tx, event }) => {
    console.log('Handle space created');

    if (!event) return;

    const votingStrategies: Strategy[] = event.args.input.votingStrategies;

    const id = getAddress(event.args.space);

    const space = new Space(id, config.indexerName);
    space.verified = false;
    space.turbo = false;
    space.metadata = null;
    space.controller = getAddress(event.args.input.owner);
    space.voting_delay = event.args.input.votingDelay;
    space.min_voting_period = event.args.input.minVotingDuration;
    space.max_voting_period = event.args.input.maxVotingDuration;
    space.proposal_threshold = '0';
    space.strategies_indices = votingStrategies.map((_, i) => i);
    // NOTE: deprecated
    space.strategies_indicies = space.strategies_indices;
    space.strategies = votingStrategies.map(s => getAddress(s.addr));
    space.next_strategy_index = votingStrategies.length;
    space.strategies_params = votingStrategies.map(s => s.params);
    space.strategies_metadata = event.args.input.votingStrategyMetadataURIs;
    space.authenticators = event.args.input.authenticators.map(
      (address: string) => getAddress(address)
    );
    space.proposal_count = 0;
    space.vote_count = 0;
    space.proposer_count = 0;
    space.voter_count = 0;
    space.created = block?.timestamp ?? getCurrentTimestamp();
    space.tx = tx.hash;

    await updateProposaValidationStrategy(
      space,
      event.args.input.proposalValidationStrategy.addr,
      event.args.input.proposalValidationStrategy.params,
      event.args.input.proposalValidationStrategyMetadataURI,
      config
    );

    try {
      const metadataUri = event.args.input.metadataURI;
      await handleSpaceMetadata(space.id, metadataUri, config);

      space.metadata = dropIpfs(metadataUri);
    } catch (e) {
      console.log('failed to parse space metadata', e);
    }

    try {
      await handleStrategiesMetadata(
        space.id,
        space.strategies_metadata,
        0,
        config
      );
    } catch (e) {
      console.log('failed to handle strategies metadata', e);
    }

    await space.save();
  };

  const handleMetadataUriUpdated: evm.Writer = async ({ rawEvent, event }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space metadata uri updated');

    const spaceId = getAddress(rawEvent.address);

    try {
      const metadataUri = event.args.newMetadataURI;
      await handleSpaceMetadata(spaceId, metadataUri, config);

      const space = await Space.loadEntity(spaceId, config.indexerName);
      if (!space) return;

      space.metadata = dropIpfs(metadataUri);

      await space.save();
    } catch (e) {
      console.log('failed to update space metadata', e);
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
        initialNextStrategy,
        config
      );
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

  const handleProposalValidationStrategyUpdated: evm.Writer = async ({
    rawEvent,
    event
  }) => {
    if (!event || !rawEvent) return;

    console.log('Handle space proposal validation strategy updated');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    await updateProposaValidationStrategy(
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
    tx,
    block
  }) => {
    if (!rawEvent || !event || !tx.hash) return;

    console.log('Handle propose');

    const spaceId = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (!space) return;

    const proposalId = event.args.proposalId.toNumber();
    const author = getAddress(event.args.author);
    const created = block?.timestamp ?? getCurrentTimestamp();

    const proposal = new Proposal(
      `${spaceId}/${proposalId}`,
      config.indexerName
    );
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
    proposal.scores_2 = '0';
    proposal.scores_3 = '0';
    proposal.scores_total = '0';
    proposal.quorum = 0n;
    proposal.strategies_indices = space.strategies_indices;
    // NOTE: deprecated
    proposal.strategies_indicies = proposal.strategies_indices;
    proposal.strategies = space.strategies;
    proposal.strategies_params = space.strategies_params;
    proposal.created = created;
    proposal.tx = tx.hash;
    proposal.execution_tx = null;
    proposal.veto_tx = null;
    proposal.vote_count = 0;

    proposal.execution_strategy = getAddress(
      event.args.proposal.executionStrategy
    );
    proposal.execution_time = 0;
    proposal.executed = false;
    proposal.vetoed = false;
    proposal.completed = false;
    proposal.cancelled = false;

    const executionStrategy = await ExecutionStrategy.loadEntity(
      proposal.execution_strategy,
      config.indexerName
    );
    if (executionStrategy) {
      proposal.quorum = BigInt(executionStrategy.quorum);
      proposal.timelock_veto_guardian =
        executionStrategy.timelock_veto_guardian;
      proposal.timelock_delay = executionStrategy.timelock_delay;
      proposal.axiom_snapshot_address =
        executionStrategy.axiom_snapshot_address;
      proposal.axiom_snapshot_slot = executionStrategy.axiom_snapshot_slot;
      proposal.execution_strategy_type = executionStrategy.type;
    } else {
      proposal.quorum = 0n;
      proposal.timelock_veto_guardian = null;
      proposal.timelock_delay = 0n;
      proposal.execution_strategy_type = 'none';
    }

    proposal.execution_ready = proposal.execution_strategy_type != 'Axiom';

    if (proposal.execution_hash !== EMPTY_EXECUTION_HASH) {
      const executionHash = new ExecutionHash(
        proposal.execution_hash,
        config.indexerName
      );
      executionHash.proposal_id = `${spaceId}/${proposalId}`;
      await executionHash.save();
    }

    try {
      const metadataUri = event.args.metadataUri;
      await handleProposalMetadata(metadataUri, config);

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

    await Promise.all([proposal.save(), space.save()]);
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

    await Promise.all([proposal.save(), space.save()]);
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

    try {
      await handleProposalMetadata(metadataUri, config);

      proposal.metadata = dropIpfs(metadataUri);
      proposal.edited = block?.timestamp ?? getCurrentTimestamp();
    } catch (e) {
      console.log('failed to update proposal metadata', e);
    }

    const executionStrategy = await ExecutionStrategy.loadEntity(
      proposal.execution_strategy,
      config.indexerName
    );
    if (executionStrategy) {
      proposal.quorum = BigInt(executionStrategy.quorum);
      proposal.timelock_veto_guardian =
        executionStrategy.timelock_veto_guardian;
      proposal.timelock_delay = executionStrategy.timelock_delay;
      proposal.axiom_snapshot_address =
        executionStrategy.axiom_snapshot_address;
      proposal.axiom_snapshot_slot = executionStrategy.axiom_snapshot_slot;
      proposal.execution_strategy_type = executionStrategy.type;
    } else {
      proposal.quorum = 0n;
      proposal.timelock_veto_guardian = null;
      proposal.timelock_delay = 0n;
      proposal.execution_strategy_type = 'none';
    }

    proposal.execution_ready = proposal.execution_strategy_type != 'Axiom';

    if (proposal.execution_hash !== EMPTY_EXECUTION_HASH) {
      const executionHash = new ExecutionHash(
        proposal.execution_hash,
        config.indexerName
      );
      executionHash.proposal_id = `${spaceId}/${proposalId}`;
      await executionHash.save();
    }

    await proposal.save();
  };

  const handleProposalExecuted: evm.Writer = async ({
    tx,
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
          proposal.completed = true;
          proposal.execution_tx = tx.hash;
          break;
        case 'SimpleQuorumTimelock':
          proposal.execution_time =
            now + Number(executionStrategy.timelock_delay);
          break;
      }
    }

    await proposal.save();
  };

  const handleVoteCast: evm.Writer = async ({ block, tx, rawEvent, event }) => {
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
    vote.created = created;
    vote.tx = tx.hash;

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

    const space = await Space.loadEntity(spaceId, config.indexerName);
    if (space) {
      space.vote_count += 1;
      if (leaderboardItem.vote_count === 1) space.voter_count += 1;

      await space.save();
    }

    const proposal = await Proposal.loadEntity(
      `${spaceId}/${proposalId}`,
      config.indexerName
    );
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

  const handleTimelockProposalExecuted: evm.Writer = async ({
    tx,
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

    proposal.completed = true;
    proposal.execution_tx = tx.hash;
    await proposal.save();
  };

  const handleTimelockProposalVetoed: evm.Writer = async ({
    tx,
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

    proposal.completed = true;
    proposal.vetoed = true;
    proposal.veto_tx = tx.hash;
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
    handleAxiomWriteOffchainVotes
  };
}
