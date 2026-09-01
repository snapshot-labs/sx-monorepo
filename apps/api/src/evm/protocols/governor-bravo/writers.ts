import { evm } from '@snapshot-labs/checkpoint';
import { evmNetworks, utils } from '@snapshot-labs/sx';
import { createPublicClient, getAddress, http, keccak256, toHex } from 'viem';
import GovernorModuleAbi from './abis/GovernorModule';
import TimelockAbi from './abis/Timelock';
import { GOVERNANCES } from './governances';
import logger from './logger';
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
  getSpaceLink,
  updateProposalScores,
  updateScoresTick
} from '../../../common/utils';
import { EVMConfig, GovernorBravoConfig } from '../../types';
import { getTimestampFromBlock as _getTimestampFromBlock } from '../../utils';
import {
  convertChoice,
  getProposalBody,
  getProposalTitle
} from '../openzeppelin/utils';

export function createWriters(
  config: EVMConfig,
  protocolConfig: GovernorBravoConfig
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

  const client = createPublicClient({
    transport: http(config.network_node_url)
  });

  async function initializeStrategies(spaceAddress: string) {
    const { symbol, governanceToken, decimals } =
      getGovernanceInfo(spaceAddress);

    const strategyId = `${spaceAddress}_strategy`;
    const strategyDataItemId = `${strategyId}_data`;

    const strategyParsedMetadataDataItem = new StrategiesParsedMetadataDataItem(
      strategyDataItemId,
      config.indexerName
    );
    strategyParsedMetadataDataItem.name = 'ERC-20 Votes';
    strategyParsedMetadataDataItem.description = '';
    strategyParsedMetadataDataItem.decimals = decimals;
    strategyParsedMetadataDataItem.symbol = symbol;
    strategyParsedMetadataDataItem.token = governanceToken;

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

    const metadataId = `${contractAddress}_metadata`;

    space = new Space(contractAddress, config.indexerName);
    space.protocol = 'governor-bravo';
    space.verified = getGovernanceInfo(contractAddress).verified ?? false;
    space.link = getSpaceLink({
      networkId: config.indexerName,
      spaceId: contractAddress
    });
    space.metadata = metadataId;
    space.created = Number(block?.timestamp ?? getCurrentTimestamp());

    // Strategies & authentication
    // NOTE: Not using multicall because some governors are older than Multicall3 contract
    const [quorum, timelock, proposalThreshold] = await Promise.all([
      client.readContract({
        address: contractAddress,
        abi: GovernorModuleAbi,
        functionName: 'quorumVotes',
        blockNumber: BigInt(blockNumber)
      }),
      client.readContract({
        address: contractAddress,
        abi: GovernorModuleAbi,
        functionName: 'timelock',
        blockNumber: BigInt(blockNumber)
      }),
      client.readContract({
        address: contractAddress,
        abi: GovernorModuleAbi,
        functionName: 'proposalThreshold',
        blockNumber: BigInt(blockNumber)
      })
    ]);

    const timelockDelay = await client.readContract({
      address: timelock,
      abi: TimelockAbi,
      functionName: 'delay',
      blockNumber: BigInt(blockNumber)
    });

    const executionStrategy = new ExecutionStrategy(
      timelock,
      config.indexerName
    );
    executionStrategy.address = timelock;
    executionStrategy.type = 'GovernorBravoTimelock';
    executionStrategy.quorum = quorum.toString();
    executionStrategy.treasury_chain = protocolConfig.chainId;
    executionStrategy.treasury = timelock;
    executionStrategy.timelock_delay = timelockDelay;
    await executionStrategy.save();

    await helpers.executeTemplate('Timelock', {
      contract: timelock,
      start: blockNumber
    });

    const { votingPowerStrategyParsedMetadata } =
      await initializeStrategies(contractAddress);

    const governanceInfo = getGovernanceInfo(contractAddress);

    const { name, symbol, treasury, governanceToken } = governanceInfo;

    const compStrategy = evmNetworks[config.indexerName].Strategies.Comp;
    if (!compStrategy) throw new Error('Comp strategy is not configured');

    space.authenticators = governanceInfo.authenticators;
    space.strategies = [compStrategy];
    space.strategies_params = [governanceToken];
    space.strategies_indices = [0];
    space.voting_power_validation_strategy_strategies = space.strategies;
    space.voting_power_validation_strategy_strategies_params =
      space.strategies_params;
    space.voting_power_validation_strategies_parsed_metadata = [
      votingPowerStrategyParsedMetadata.id
    ];
    space.proposal_threshold = proposalThreshold.toString();

    const spaceMetadata = new SpaceMetadataItem(metadataId, config.indexerName);
    spaceMetadata.name = name;
    spaceMetadata.about = governanceInfo.about || '';
    spaceMetadata.avatar = governanceInfo.avatar || '';
    spaceMetadata.external_url = governanceInfo.externalUrl || '';
    spaceMetadata.twitter = governanceInfo.twitter || '';
    spaceMetadata.github = governanceInfo.github || '';
    spaceMetadata.farcaster = governanceInfo.farcaster || '';
    spaceMetadata.voting_power_symbol = symbol;
    spaceMetadata.treasuries = [
      JSON.stringify({
        name: treasury.name,
        chain_id: treasury.chainId,
        address: treasury.address
      })
    ];
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
    typeof GovernorModuleAbi,
    'ProposalCreated'
  > = async ({ blockNumber, block, txId, event, rawEvent, helpers }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal created');

    const id = event.args.id;
    const spaceAddress = getAddress(rawEvent.address);
    const proposerAddress = getAddress(event.args.proposer);
    const proposalId = `${spaceAddress}/${id}`;
    const proposalMetadataId = `${proposalId}_metadata`;
    const leaderboardId = `${spaceAddress}/${proposerAddress}`;

    await initializeSpace(spaceAddress, blockNumber, block, helpers);
    await initializeUser(proposerAddress, block);

    const governanceInfo = getGovernanceInfo(spaceAddress);

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

    const proposal = new Proposal(proposalId, config.indexerName);
    proposal.link = getProposalLink({
      networkId: config.indexerName,
      spaceId: spaceAddress,
      proposalId: id
    });
    proposal.proposal_id = id.toString();
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

    const [start, end] = await Promise.all([
      getTimestampFromBlock(event.args.startBlock),
      getTimestampFromBlock(event.args.endBlock)
    ]);

    proposal.start = start;
    proposal.start_block_number = event.args.startBlock;
    proposal.min_end = end;
    proposal.min_end_block_number = event.args.endBlock;
    proposal.max_end = proposal.min_end;
    proposal.max_end_block_number = proposal.min_end_block_number;
    proposal.snapshot = event.args.startBlock;
    proposal.treasuries = spaceMetadataItem?.treasuries || [];
    proposal.quorum = executionStrategy.quorum;
    proposal.strategies = space.strategies;
    proposal.strategies_params = space.strategies_params;
    proposal.strategies_indices = space.strategies_indices;
    proposal.execution_strategy = executionStrategy.address;
    proposal.execution_strategy_type = executionStrategy.type;
    proposal.execution_strategy_details = executionStrategy.id;
    proposal.vp_decimals = governanceInfo.decimals;
    proposal.type = 'basic';
    proposal.scores = ['0', '0', '0'];
    proposal.scores_parsed = [0, 0, 0];
    proposal.quorum_type = 'for_only';
    proposal.created = Number(block?.timestamp ?? getCurrentTimestamp());
    proposal.tx = txId;

    space.proposal_count += 1;

    const proposalMetadata = new ProposalMetadataItem(
      proposalMetadataId,
      config.indexerName
    );

    const proposalBody = event.args.description || '';

    const execution = await Promise.all(
      event.args.targets.map((target, index) => {
        const signature = event.args.signatures[index] ?? '';

        let calldata: `0x${string}` | '';
        if (signature) {
          const sighash = keccak256(toHex(signature)).slice(0, 10);
          calldata =
            `${sighash}${(event.args.calldatas[index] ?? '').slice(2)}` as `0x${string}`;
        } else {
          calldata = event.args.calldatas[index] ?? '';
        }

        return utils.execution.convertToTransaction(
          {
            target,
            calldata,
            value: event.args.values[index]?.toString() ?? '0'
          },
          protocolConfig.chainId
        );
      })
    );

    proposalMetadata.title = getProposalTitle(proposalBody);
    proposalMetadata.body = getProposalBody(proposalBody);
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
      leaderboardItem.save()
    ]);
  };

  const handleProposalCanceled: evm.Writer<
    typeof GovernorModuleAbi,
    'ProposalCanceled'
  > = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal canceled');

    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${event.args.id}`;

    const [proposal, space] = await Promise.all([
      Proposal.loadEntity(proposalId, config.indexerName),
      Space.loadEntity(spaceAddress, config.indexerName)
    ]);
    if (!proposal || !space) return;
    if (proposal.cancelled) return;

    proposal.cancelled = true;
    space.proposal_count -= 1;
    space.vote_count -= proposal.vote_count;

    await Promise.all([proposal.save(), space.save()]);
  };

  const handleProposalQueued: evm.Writer<
    typeof GovernorModuleAbi,
    'ProposalQueued'
  > = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal queued');

    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${event.args.id}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.executed = true;
    proposal.execution_time = event.args.eta;

    await proposal.save();
  };

  const handleProposalExecuted: evm.Writer<
    typeof GovernorModuleAbi,
    'ProposalExecuted'
  > = async ({ event, rawEvent, block, blockNumber }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal executed');

    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${event.args.id}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.execution_settled = true;
    proposal.completed = true;
    proposal.execution_tx = rawEvent.transactionHash;
    proposal.executed_at = block?.timestamp ?? BigInt(getCurrentTimestamp());
    proposal.executed_at_block_number = BigInt(blockNumber);

    await proposal.save();
  };

  const handleVoteCast: evm.Writer<
    typeof GovernorModuleAbi,
    'VoteCast'
  > = async ({ block, txId, event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle vote cast');

    const id = event.args.proposalId;
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
    vote.proposal = id.toString();
    vote.choice = choice;
    vote.vp = event.args.votes.toString();
    vote.vp_parsed = getParsedVP(vote.vp, proposal.vp_decimals);
    vote.metadata = voteMetadataId;
    vote.created = Number(block?.timestamp ?? getCurrentTimestamp());
    vote.tx = txId;

    updateProposalScores(proposal, choice, BigInt(vote.vp));

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

    await updateScoresTick(proposal, vote.created, config.indexerName);
    await Promise.all([
      space.save(),
      proposal.save(),
      vote.save(),
      voteMetadata.save(),
      leaderboardItem.save()
    ]);
  };

  const handleProposalThresholdSet: evm.Writer<
    typeof GovernorModuleAbi,
    'ProposalThresholdSet'
  > = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle proposal threshold set');

    const spaceAddress = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.proposal_threshold = event.args.newProposalThreshold.toString();

    await space.save();
  };

  const handleNewAdmin: evm.Writer<
    typeof GovernorModuleAbi,
    'NewAdmin'
  > = async ({ event, rawEvent }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle new admin');

    const spaceAddress = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.controller = event.args.newAdmin;

    await space.save();
  };

  const handleNewDelay: evm.Writer<typeof TimelockAbi, 'NewDelay'> = async ({
    event,
    rawEvent
  }) => {
    if (!event || !rawEvent) return;

    logger.info('Handle new delay');

    const timelockAddress = getAddress(rawEvent.address);

    const timelock = await ExecutionStrategy.loadEntity(
      timelockAddress,
      config.indexerName
    );
    if (!timelock) return;

    timelock.timelock_delay = event.args.newDelay;

    await timelock.save();
  };

  return {
    handleProposalCreated,
    handleProposalCanceled,
    handleProposalQueued,
    handleProposalExecuted,
    handleVoteCast,
    handleProposalThresholdSet,
    handleNewAdmin,
    handleNewDelay
  };
}
