import { evm } from '@snapshot-labs/checkpoint';
import { evmNetworks, utils } from '@snapshot-labs/sx';
import { createPublicClient, getAddress, http, keccak256, toHex } from 'viem';
import ERC20VotesAbi from './abis/ERC20Votes';
import GovernorSettingsAbi from './abis/GovernorSettings';
import GovernorTimelockControlAbi from './abis/GovernorTimelockControl';
import GovernorVotesAbi from './abis/GovernorVotes';
import IGovernorAbi from './abis/IGovernor';
import TimelockControllerAbi from './abis/TimelockController';
import { GOVERNANCES } from './governances';
import logger from './logger';
import { convertChoice, getProposalBody, getProposalTitle } from './utils';
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

  const createTreasuries = (timelockAddress: string) => {
    return [
      JSON.stringify({
        name: 'Timelock',
        chain_id: protocolConfig.chainId,
        address: timelockAddress
      })
    ];
  };

  const client = createPublicClient({
    transport: http(config.network_node_url)
  });

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
    contractAddress: `0x${string}`,
    blockNumber: number,
    block: evm.Block | null,
    helpers: Parameters<evm.Writer>[0]['helpers']
  ) {
    let space = await Space.loadEntity(contractAddress, config.indexerName);
    if (space) return;

    const { metadataId } = getEntitiesIds(contractAddress);

    space = new Space(contractAddress, config.indexerName);
    space.protocol = '@openzeppelin/governor';
    space.verified = true;
    space.link = getSpaceLink({
      networkId: config.indexerName,
      spaceId: contractAddress
    });
    space.metadata = metadataId;
    space.created = Number(block?.timestamp ?? getCurrentTimestamp());

    // Strategies & authentication
    const [quorum, timelock, token, proposalThreshold] = await Promise.all([
      client.readContract({
        address: contractAddress,
        abi: IGovernorAbi,
        functionName: 'quorum',
        args: [BigInt(blockNumber - 1)],
        blockNumber: BigInt(blockNumber)
      }),
      client.readContract({
        address: contractAddress,
        abi: GovernorTimelockControlAbi,
        functionName: 'timelock',
        blockNumber: BigInt(blockNumber)
      }),
      client.readContract({
        address: contractAddress,
        abi: GovernorVotesAbi,
        functionName: 'token',
        blockNumber: BigInt(blockNumber)
      }),
      client.readContract({
        address: contractAddress,
        abi: IGovernorAbi,
        functionName: 'proposalThreshold',
        blockNumber: BigInt(blockNumber)
      })
    ]);

    const [decimals, symbol] = await Promise.all([
      client.readContract({
        address: token,
        abi: ERC20VotesAbi,
        functionName: 'decimals',
        blockNumber: BigInt(blockNumber)
      }),
      client.readContract({
        address: token,
        abi: ERC20VotesAbi,
        functionName: 'symbol',
        blockNumber: BigInt(blockNumber)
      })
    ]);

    const timelockDelay = await client.readContract({
      address: timelock,
      abi: TimelockControllerAbi,
      functionName: 'getMinDelay',
      blockNumber: BigInt(blockNumber)
    });

    const executionStrategy = new ExecutionStrategy(
      timelock,
      config.indexerName
    );
    executionStrategy.address = timelock;
    executionStrategy.type = 'OpenZeppelinTimelockController';
    executionStrategy.quorum = quorum.toString();
    executionStrategy.treasury_chain = protocolConfig.chainId;
    executionStrategy.treasury = timelock;
    executionStrategy.timelock_delay = timelockDelay;
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
    spaceMetadata.about = governanceInfo.about || '';
    spaceMetadata.avatar = governanceInfo.avatar || '';
    spaceMetadata.external_url = governanceInfo.externalUrl || '';
    spaceMetadata.github = governanceInfo.github || '';
    spaceMetadata.twitter = governanceInfo.twitter || '';
    spaceMetadata.farcaster = governanceInfo.farcaster || '';
    spaceMetadata.voting_power_symbol = symbol;
    spaceMetadata.treasuries = createTreasuries(timelock);
    spaceMetadata.executors_strategies = [executionStrategy.id];
    await spaceMetadata.save();

    await space.save();
  }

  async function initializeUser(address: string, block: evm.Block | null) {
    let user = await User.loadEntity(address, config.indexerName);
    if (user) return;

    user = new User(address, config.indexerName);
    user.address_type = 1;
    user.created = Number(block?.timestamp ?? getCurrentTimestamp());
    await user.save();
  }

  const handleProposalCreated: evm.Writer<
    typeof IGovernorAbi,
    'ProposalCreated'
  > = async ({ blockNumber, block, txId, event, rawEvent, helpers }) => {
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

    const quorum = await client.readContract({
      address: spaceAddress,
      abi: IGovernorAbi,
      functionName: 'quorum',
      args: [BigInt(blockNumber - 1)],
      blockNumber: BigInt(blockNumber)
    });

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

    const getTimestampFromBlock = (value: bigint) =>
      _getTimestampFromBlock({
        networkId: config.indexerName,
        blockNumber: Number(value),
        currentBlockNumber: blockNumber,
        currentTimestamp: Number(block?.timestamp ?? getCurrentTimestamp()),
        client
      });

    proposal.start = await getTimestampFromBlock(event.args.voteStart);
    proposal.start_block_number = Number(event.args.voteStart);
    proposal.min_end = await getTimestampFromBlock(event.args.voteEnd);
    proposal.min_end_block_number = Number(event.args.voteEnd);
    proposal.max_end = proposal.min_end;
    proposal.max_end_block_number = proposal.min_end_block_number;
    proposal.snapshot = proposal.start_block_number;
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
    proposal.created = Number(block?.timestamp ?? getCurrentTimestamp());
    proposal.tx = txId;

    space.proposal_count += 1;

    const proposalMetadata = new ProposalMetadataItem(
      proposalMetadataId,
      config.indexerName
    );

    const proposalBody = event.args.description || '';

    const execution = await Promise.all(
      event.args.targets.map((target, index) =>
        utils.execution.convertToTransaction(
          {
            target,
            calldata: event.args.calldatas[index] ?? '0x',
            value: event.args.values[index]?.toString() ?? '0'
          },
          protocolConfig.chainId
        )
      )
    );

    proposalMetadata.title = getProposalTitle(proposalBody);
    proposalMetadata.body = getProposalBody(proposalBody);
    proposalMetadata.choices = ['For', 'Against', 'Abstain'];
    proposalMetadata.execution = JSON.stringify(execution);
    proposal.execution_hash = keccak256(toHex(proposalBody));

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

  const handleProposalCanceled: evm.Writer<
    typeof IGovernorAbi,
    'ProposalCanceled'
  > = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal canceled');

    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${event.args.proposalId}`;

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

  const handleProposalQueued: evm.Writer<
    typeof IGovernorAbi,
    'ProposalQueued'
  > = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal queued');

    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${event.args.proposalId}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.executed = true;
    proposal.execution_time = Number(event.args.etaSeconds);

    await proposal.save();
  };

  const handleProposalExecuted: evm.Writer<
    typeof IGovernorAbi,
    'ProposalExecuted'
  > = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal executed');

    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${event.args.proposalId}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.execution_settled = true;
    proposal.completed = true;
    proposal.execution_tx = rawEvent.transactionHash;

    await proposal.save();
  };

  const handleVoteCast: evm.Writer<typeof IGovernorAbi, 'VoteCast'> = async ({
    block,
    txId,
    event,
    rawEvent
  }) => {
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
    vote.created = Number(block?.timestamp ?? getCurrentTimestamp());
    vote.tx = txId;

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

  const handleProposalThresholdSet: evm.Writer<
    typeof GovernorSettingsAbi,
    'ProposalThresholdSet'
  > = async ({ event, rawEvent, blockNumber, block, helpers }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal threshold set');

    const spaceAddress = getAddress(rawEvent.address);
    await initializeSpace(spaceAddress, blockNumber, block, helpers);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.proposal_threshold = event.args.newProposalThreshold.toString();

    await space.save();
  };

  const handleVotingDelaySet: evm.Writer<
    typeof GovernorSettingsAbi,
    'VotingDelaySet'
  > = async ({ event, rawEvent, blockNumber, block, helpers }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle voting delay set');

    const spaceAddress = getAddress(rawEvent.address);
    await initializeSpace(spaceAddress, blockNumber, block, helpers);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.voting_delay = Number(event.args.newVotingDelay);

    await space.save();
  };

  const handleVotingPeriodSet: evm.Writer<
    typeof GovernorSettingsAbi,
    'VotingPeriodSet'
  > = async ({ event, rawEvent, blockNumber, block, helpers }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle voting period set');

    const spaceAddress = getAddress(rawEvent.address);
    await initializeSpace(spaceAddress, blockNumber, block, helpers);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.min_voting_period = Number(event.args.newVotingPeriod);
    space.max_voting_period = space.min_voting_period;

    await space.save();
  };

  const handleTimelockChange: evm.Writer<
    typeof GovernorTimelockControlAbi,
    'TimelockChange'
  > = async ({ event, rawEvent, blockNumber, block, helpers }) => {
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
      getAddress(event.args.newTimelock)
    );

    const [timelockDelay, quorum] = await Promise.all([
      client.readContract({
        address: timelock,
        abi: TimelockControllerAbi,
        functionName: 'getMinDelay',
        blockNumber: BigInt(blockNumber)
      }),
      client.readContract({
        address: spaceAddress,
        abi: IGovernorAbi,
        functionName: 'quorum',
        args: [BigInt(blockNumber - 1)],
        blockNumber: BigInt(blockNumber)
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
      executionStrategy.timelock_delay = timelockDelay;
      await executionStrategy.save();

      await helpers.executeTemplate('OpenZeppelinTimelockController', {
        contract: timelock,
        start: blockNumber
      });

      spaceMetadataItem.executors_strategies = [executionStrategy.id];
      await spaceMetadataItem.save();
    }
  };

  const handleNewDelay: evm.Writer<
    typeof TimelockControllerAbi,
    'MinDelayChange'
  > = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle new delay');

    const timelockAddress = getAddress(rawEvent.address);

    const timelock = await ExecutionStrategy.loadEntity(
      timelockAddress,
      config.indexerName
    );
    if (!timelock) return;

    timelock.timelock_delay = event.args.newDuration;

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
