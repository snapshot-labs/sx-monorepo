import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { evm } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import ERC20Votes from './abis/ERC20Votes.json';
import GovernorTimelockControl from './abis/GovernorTimelockControl.json';
import GovernorVotes from './abis/GovernorVotes.json';
import TimelockController from './abis/TimelockController.json';
import { GOVERNANCES } from './governances';
import logger from './logger';
import { convertChoice, getProposalTitle } from './utils';
import {
  ExecutionStrategy,
  Leaderboard,
  Proposal,
  ProposalMetadataItem,
  Space,
  SpaceMetadataItem,
  StrategiesParsedMetadataDataItem,
  StrategiesParsedMetadataItem,
  User,
  Vote,
  VoteMetadataItem,
  VotingPowerValidationStrategiesParsedMetadataItem
} from '../../../../.checkpoint/models';
import {
  getCurrentTimestamp,
  getParsedVP,
  getProposalLink,
  getSpaceLink
} from '../../../common/utils';
import { EVMConfig, OpenZeppelinConfig } from '../../types';
import { getTimestampFromBlock as _getTimestampFromBlock } from '../../utils';

export function createWriters(
  config: EVMConfig,
  protocolConfig: OpenZeppelinConfig
) {
  const governances = GOVERNANCES[config.indexerName];
  if (!governances) throw new Error('Governances not found for this network');

  const getGovernanceInfo = (address: string) => {
    const governanceInfo = Object.values(governances).find(
      governance => governance.address === address
    );
    if (!governanceInfo) {
      throw new Error(`Governance info not found for ${address}`);
    }

    return governanceInfo;
  };

  const getEntitiesIds = (spaceAddress: string) => {
    const strategyId = `${spaceAddress}_strategy`;
    const strategyDataItemId = `${strategyId}_data`;
    const metadataId = `${spaceAddress}_metadata`;

    return { strategyId, strategyDataItemId, metadataId };
  };

  const createTreasuries = (spaceAddress: string, timelockAddress: string) => {
    const governanceInfo = getGovernanceInfo(spaceAddress);

    return [
      JSON.stringify({
        name: `${governanceInfo.name} Governance`,
        chain_id: protocolConfig.chainId,
        address: timelockAddress
      })
    ];
  };

  const provider = new StaticJsonRpcProvider(
    config.network_node_url,
    protocolConfig.chainId
  );

  async function initializeStrategies({
    spaceAddress,
    decimals,
    symbol,
    token
  }: {
    spaceAddress: string;
    decimals: number;
    symbol: string;
    token: string;
  }) {
    const { strategyId, strategyDataItemId } = getEntitiesIds(spaceAddress);

    const strategyParsedMetadataDataItem = new StrategiesParsedMetadataDataItem(
      strategyDataItemId,
      config.indexerName
    );
    strategyParsedMetadataDataItem.name = 'ERC-20 Votes';
    strategyParsedMetadataDataItem.description = '';
    strategyParsedMetadataDataItem.token = token;
    strategyParsedMetadataDataItem.symbol = symbol;
    strategyParsedMetadataDataItem.decimals = decimals;

    await strategyParsedMetadataDataItem.save();

    const strategyParsedMetadata = new StrategiesParsedMetadataItem(
      strategyId,
      config.indexerName
    );
    strategyParsedMetadata.space = spaceAddress;
    strategyParsedMetadata.index = 0;
    strategyParsedMetadata.data = strategyDataItemId;

    await strategyParsedMetadata.save();

    const votingPowerStrategyParsedMetadata =
      new VotingPowerValidationStrategiesParsedMetadataItem(
        strategyId,
        config.indexerName
      );
    votingPowerStrategyParsedMetadata.space = spaceAddress;
    votingPowerStrategyParsedMetadata.index = 0;
    votingPowerStrategyParsedMetadata.data = strategyDataItemId;

    await votingPowerStrategyParsedMetadata.save();

    return {
      strategyParsedMetadata,
      votingPowerStrategyParsedMetadata
    };
  }

  async function initializeSpace(
    contractAddress: string,
    blockNumber: number,
    block: evm.Block | null,
    helpers: Parameters<evm.Writer>[0]['helpers']
  ) {
    let space = await Space.loadEntity(contractAddress, config.indexerName);
    if (space) return;

    const { metadataId } = getEntitiesIds(contractAddress);

    space = new Space(contractAddress, config.indexerName);
    space.protocol = 'open-zeppelin';
    space.verified = true;
    space.link = getSpaceLink({
      networkId: config.indexerName,
      spaceId: contractAddress
    });
    space.metadata = metadataId;
    space.created = block?.timestamp ?? getCurrentTimestamp();

    // Strategies & authentication
    const overrides = {
      blockTag: blockNumber
    };

    const governorTimelockContract = new Contract(
      contractAddress,
      GovernorTimelockControl,
      provider
    );

    const governorVotesContract = new Contract(
      contractAddress,
      GovernorVotes,
      provider
    );

    const [quorum, timelock, token, proposalThreshold] = await Promise.all([
      governorTimelockContract.quorum(blockNumber - 1, overrides),
      governorTimelockContract.timelock(overrides),
      governorVotesContract.token(overrides),
      governorTimelockContract.proposalThreshold(overrides)
    ]);

    const tokenContract = new Contract(token, ERC20Votes, provider);

    const [decimals, symbol] = await Promise.all([
      tokenContract.decimals(overrides),
      tokenContract.symbol(overrides)
    ]);

    const timelockContract = new Contract(
      timelock,
      TimelockController,
      provider
    );
    const timelockDelay = await timelockContract.getMinDelay(overrides);

    const executionStrategy = new ExecutionStrategy(
      timelock,
      config.indexerName
    );
    executionStrategy.address = timelock;
    executionStrategy.type = 'OpenZeppelinTimelockController';
    executionStrategy.quorum = quorum.toString();
    executionStrategy.treasury_chain = protocolConfig.chainId;
    executionStrategy.treasury = timelock;
    executionStrategy.timelock_delay = timelockDelay.toString();
    await executionStrategy.save();

    await helpers.executeTemplate('OpenZeppelinTimelockController', {
      contract: timelock,
      start: blockNumber
    });

    const { votingPowerStrategyParsedMetadata } = await initializeStrategies({
      spaceAddress: contractAddress,
      token,
      symbol,
      decimals
    });

    const governanceInfo = getGovernanceInfo(contractAddress);

    space.authenticators = ['OpenZeppelinAuthenticator'];
    space.strategies = [evmNetworks[config.indexerName].Strategies.OZVotes];
    space.strategies_params = [token];
    space.strategies_indices = [0];
    space.voting_power_validation_strategy_strategies = space.strategies;
    space.voting_power_validation_strategy_strategies_params =
      space.strategies_params;
    space.voting_power_validation_strategies_parsed_metadata = [
      votingPowerStrategyParsedMetadata.id
    ];
    space.proposal_threshold = proposalThreshold.toString();

    const spaceMetadata = new SpaceMetadataItem(metadataId, config.indexerName);
    spaceMetadata.name = governanceInfo.name;
    spaceMetadata.voting_power_symbol = symbol;
    spaceMetadata.treasuries = createTreasuries(contractAddress, timelock);
    spaceMetadata.executors_strategies = [executionStrategy.id];
    await spaceMetadata.save();

    await space.save();
  }

  async function initializeUser(address: string, block: evm.Block | null) {
    let user = await User.loadEntity(address, config.indexerName);
    if (user) return;

    user = new User(address, config.indexerName);
    user.address_type = 1;
    user.created = block?.timestamp ?? getCurrentTimestamp();
    await user.save();
  }

  const handleProposalCreated: evm.Writer = async ({
    blockNumber,
    block,
    event,
    rawEvent,
    helpers
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal created');

    const id = event.args.proposalId.toString();
    const spaceAddress = getAddress(rawEvent.address);
    const proposerAddress = getAddress(event.args.proposer);
    const proposalId = `${spaceAddress}/${id}`;
    const proposalMetadataId = `${proposalId}_metadata`;
    const leaderboardId = `${spaceAddress}/${proposerAddress}`;

    await initializeSpace(spaceAddress, blockNumber, block, helpers);
    await initializeUser(proposerAddress, block);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    const governorContract = new Contract(
      spaceAddress,
      GovernorTimelockControl,
      provider
    );

    const spaceMetadataItem = space.metadata
      ? await SpaceMetadataItem.loadEntity(space.metadata, config.indexerName)
      : null;

    const executionStrategyAddress =
      spaceMetadataItem?.executors_strategies?.[0];
    if (!executionStrategyAddress) return;

    const executionStrategy = await ExecutionStrategy.loadEntity(
      executionStrategyAddress,
      config.indexerName
    );
    if (!executionStrategy) return;

    const strategyParsedMetadataDataItem =
      await StrategiesParsedMetadataDataItem.loadEntity(
        getEntitiesIds(spaceAddress).strategyDataItemId,
        config.indexerName
      );
    if (!strategyParsedMetadataDataItem) return;

    const overrides = {
      blockTag: blockNumber
    };

    const quorum = await governorContract.quorum(blockNumber - 1, overrides);

    executionStrategy.quorum = quorum.toString();

    const proposal = new Proposal(proposalId, config.indexerName);
    proposal.link = getProposalLink({
      networkId: config.indexerName,
      spaceId: spaceAddress,
      proposalId: id
    });
    proposal.proposal_id = id;
    proposal.space = space.id;
    proposal.author = proposerAddress;
    proposal.metadata = proposalMetadataId;

    const getTimestampFromBlock = (value: number) =>
      _getTimestampFromBlock({
        networkId: config.indexerName,
        blockNumber: value,
        currentBlockNumber: blockNumber,
        currentTimestamp: block?.timestamp ?? getCurrentTimestamp()
      });

    proposal.start = getTimestampFromBlock(event.args.voteStart.toNumber());
    proposal.start_block_number = event.args.voteStart.toNumber();
    proposal.min_end = getTimestampFromBlock(event.args.voteEnd.toNumber());
    proposal.min_end_block_number = event.args.voteEnd.toNumber();
    proposal.max_end = proposal.min_end;
    proposal.max_end_block_number = proposal.min_end_block_number;
    proposal.snapshot = proposal.start;
    proposal.treasuries = spaceMetadataItem?.treasuries || [];
    proposal.quorum = executionStrategy.quorum;
    proposal.strategies = space.strategies;
    proposal.strategies_params = space.strategies_params;
    proposal.strategies_indices = space.strategies_indices;
    proposal.execution_strategy = executionStrategy.address;
    proposal.execution_strategy_type = executionStrategy.type;
    proposal.execution_strategy_details = executionStrategy.id;
    proposal.vp_decimals = strategyParsedMetadataDataItem.decimals;
    proposal.type = 'basic';
    proposal.created = block?.timestamp ?? getCurrentTimestamp();
    proposal.tx = rawEvent.transactionHash;

    space.proposal_count += 1;

    const proposalMetadata = new ProposalMetadataItem(
      proposalMetadataId,
      config.indexerName
    );

    const proposalBody = event.args.description || '';

    const targets: string[] = event.args.targets;
    const calldatas: string[] = event.args.calldatas;
    // NOTE: this is called "values" and conflicts with Result object
    const values: BigNumber[] = event.args[3];

    const execution = targets.map((target, index) => ({
      _type: 'raw',
      _form: {
        recipient: target
      },
      to: target,
      data: calldatas[index] ?? '0x',
      value: values[index]?.toString() ?? '0',
      salt: '0'
    }));

    proposalMetadata.title = getProposalTitle(proposalBody);
    proposalMetadata.body = proposalBody;
    proposalMetadata.choices = ['For', 'Against', 'Abstain'];
    proposalMetadata.execution = JSON.stringify(execution);

    let leaderboardItem = await Leaderboard.loadEntity(
      leaderboardId,
      config.indexerName
    );
    if (!leaderboardItem) {
      leaderboardItem = new Leaderboard(leaderboardId, config.indexerName);
      leaderboardItem.space = spaceAddress;
      leaderboardItem.user = proposerAddress;
      leaderboardItem.vote_count = 0;
      leaderboardItem.proposal_count = 0;
    }

    leaderboardItem.proposal_count += 1;

    await Promise.all([
      proposal.save(),
      space.save(),
      proposalMetadata.save(),
      leaderboardItem.save(),
      executionStrategy.save()
    ]);
  };

  const handleProposalCanceled: evm.Writer = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal canceled');

    const id = event.args.id.toNumber();
    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${id}`;

    const [proposal, space] = await Promise.all([
      Proposal.loadEntity(proposalId, config.indexerName),
      Space.loadEntity(spaceAddress, config.indexerName)
    ]);
    if (!proposal || !space) return;

    proposal.cancelled = true;
    space.proposal_count -= 1;
    space.vote_count -= proposal.vote_count;

    await Promise.all([proposal.save(), space.save()]);
  };

  const handleProposalQueued: evm.Writer = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal queued');

    const id = event.args.proposalId.toString();
    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${id}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.executed = true;
    proposal.execution_time = event.args.etaSeconds.toNumber();

    await proposal.save();
  };

  const handleProposalExecuted: evm.Writer = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal executed');

    const id = event.args.proposalId.toString();
    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${id}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.execution_settled = true;
    proposal.completed = true;
    proposal.execution_tx = rawEvent.transactionHash;

    await proposal.save();
  };

  const handleVoteCast: evm.Writer = async ({ block, event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle vote cast');

    const id = event.args.proposalId.toString();
    const voterAddress = getAddress(event.args.voter);
    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${id}`;
    const voteId = `${proposalId}/${voterAddress}`;
    const voteMetadataId = `${voteId}_metadata`;
    const leaderboardId = `${spaceAddress}/${voterAddress}`;

    await initializeUser(voterAddress, block);

    const [space, proposal, user] = await Promise.all([
      Space.loadEntity(spaceAddress, config.indexerName),
      Proposal.loadEntity(proposalId, config.indexerName),
      User.loadEntity(voterAddress, config.indexerName)
    ]);
    if (!space || !proposal || !user) return;

    space.vote_count += 1;
    proposal.vote_count += 1;
    user.vote_count += 1;

    const voteMetadata = new VoteMetadataItem(
      voteMetadataId,
      config.indexerName
    );
    voteMetadata.reason = event.args.reason || '';

    const choice = convertChoice(event.args.support);
    if (!choice) return;

    const vote = new Vote(voteId, config.indexerName);
    vote.voter = voterAddress;
    vote.space = space.id;
    vote.proposal = id;
    vote.choice = choice;
    vote.vp = event.args.weight.toString();
    vote.vp_parsed = getParsedVP(vote.vp, proposal.vp_decimals);
    vote.metadata = voteMetadataId;
    vote.created = block?.timestamp ?? getCurrentTimestamp();
    vote.tx = rawEvent.transactionHash;

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

    let leaderboardItem = await Leaderboard.loadEntity(
      leaderboardId,
      config.indexerName
    );
    if (!leaderboardItem) {
      leaderboardItem = new Leaderboard(leaderboardId, config.indexerName);
      leaderboardItem.space = spaceAddress;
      leaderboardItem.user = voterAddress;
      leaderboardItem.vote_count = 0;
      leaderboardItem.proposal_count = 0;
    }

    leaderboardItem.vote_count += 1;

    await Promise.all([
      space.save(),
      proposal.save(),
      vote.save(),
      voteMetadata.save(),
      leaderboardItem.save()
    ]);
  };

  const handleProposalThresholdSet: evm.Writer = async ({
    event,
    rawEvent,
    blockNumber,
    block,
    helpers
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal threshold set');

    const spaceAddress = getAddress(rawEvent.address);
    await initializeSpace(spaceAddress, blockNumber, block, helpers);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.proposal_threshold = event.args.newProposalThreshold.toString();

    await space.save();
  };

  const handleVotingDelaySet: evm.Writer = async ({
    event,
    rawEvent,
    blockNumber,
    block,
    helpers
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle voting delay set');

    const spaceAddress = getAddress(rawEvent.address);
    await initializeSpace(spaceAddress, blockNumber, block, helpers);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.voting_delay = event.args.newVotingDelay.toNumber();

    await space.save();
  };

  const handleVotingPeriodSet: evm.Writer = async ({
    event,
    rawEvent,
    blockNumber,
    block,
    helpers
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle voting period set');

    const spaceAddress = getAddress(rawEvent.address);
    await initializeSpace(spaceAddress, blockNumber, block, helpers);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.min_voting_period = event.args.newVotingPeriod.toNumber();
    space.max_voting_period = space.min_voting_period;

    await space.save();
  };

  const handleTimelockChange: evm.Writer = async ({
    event,
    rawEvent,
    blockNumber,
    block,
    helpers
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle timelock change');

    const spaceAddress = getAddress(rawEvent.address);
    await initializeSpace(spaceAddress, blockNumber, block, helpers);

    const timelock = event.args.newTimelock;

    const { metadataId } = getEntitiesIds(spaceAddress);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    const spaceMetadataItem = await SpaceMetadataItem.loadEntity(
      metadataId,
      config.indexerName
    );
    if (!spaceMetadataItem) return;

    spaceMetadataItem.treasuries = createTreasuries(
      spaceAddress,
      getAddress(event.args.newTimelock)
    );

    const spaceContract = new Contract(
      spaceAddress,
      GovernorTimelockControl,
      provider
    );

    const timelockContract = new Contract(
      timelock,
      TimelockController,
      provider
    );

    const [timelockDelay, quorum] = await Promise.all([
      timelockContract.getMinDelay({
        blockTag: blockNumber
      }),
      spaceContract.quorum(blockNumber - 1, {
        blockTag: blockNumber
      })
    ]);

    const executionStrategy = await ExecutionStrategy.loadEntity(
      timelock,
      config.indexerName
    );

    if (!executionStrategy) {
      const executionStrategy = new ExecutionStrategy(
        timelock,
        config.indexerName
      );

      executionStrategy.address = timelock;
      executionStrategy.type = 'OpenZeppelinTimelockController';
      executionStrategy.quorum = quorum.toString();
      executionStrategy.treasury_chain = protocolConfig.chainId;
      executionStrategy.treasury = timelock;
      executionStrategy.timelock_delay = timelockDelay.toString();
      await executionStrategy.save();

      await helpers.executeTemplate('OpenZeppelinTimelockController', {
        contract: timelock,
        start: blockNumber
      });

      spaceMetadataItem.executors_strategies = [executionStrategy.id];
      await spaceMetadataItem.save();
    }
  };

  const handleNewDelay: evm.Writer = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle new delay');

    const timelockAddress = getAddress(rawEvent.address);

    const timelock = await ExecutionStrategy.loadEntity(
      timelockAddress,
      config.indexerName
    );
    if (!timelock) return;

    timelock.timelock_delay = event.args.newDuration.toString();

    await timelock.save();
  };

  return {
    // IGovernor
    handleProposalCreated,
    handleProposalCanceled,
    handleProposalQueued,
    handleProposalExecuted,
    handleVoteCast,
    // GovernorSettings
    handleProposalThresholdSet,
    handleVotingDelaySet,
    handleVotingPeriodSet,
    // GovernorTimelockControl
    handleTimelockChange,
    // TimelockController
    handleNewDelay
  };
}
