import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { evm } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import GovernorModule from './abis/GovernorModule.json';
import Timelock from './abis/Timelock.json';
import { convertChoice, getProposalTitle } from './utils';
import {
  getCurrentTimestamp,
  getParsedVP,
  getProposalLink,
  getSpaceLink
} from '../../..//common/utils';
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
import { EVMConfig, GovernorBravoConfig } from '../../types';

type SpaceData = {
  name: string;
  symbol: string;
  decimals: number;
  governanceToken: string;
  treasury: {
    name: string;
    address: string;
    chain_id: number;
  };
};

const spaceData: Record<string, SpaceData | undefined> = {
  '0x408ED6354d4973f66138C91495F2f2FCbd8724C3': {
    name: 'Uniswap',
    symbol: 'UNI',
    decimals: 18,
    governanceToken: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    treasury: {
      name: 'Uniswap Treasury',
      address: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
      chain_id: 1
    }
  },
  '0x69112D158A607DD388034c0C09242FF966985258': {
    name: 'Sepolia Governor Bravo',
    symbol: 'MOCK',
    decimals: 18,
    governanceToken: '0xc27427e6B1a112eD59f9dB58c34BC13a7ee76546',
    treasury: {
      name: 'MOCK',
      address: '0x52f26d07f8fEf1CF806A53159ce68bf1B4031baB',
      chain_id: 11155111
    }
  }
};

export function createWriters(
  config: EVMConfig,
  protocolConfig: GovernorBravoConfig
) {
  const provider = new StaticJsonRpcProvider(
    config.network_node_url,
    protocolConfig.chainId
  );

  async function initializeStrategies(spaceAddress: string) {
    const spaceDataEntry = spaceData[spaceAddress];
    if (!spaceDataEntry) {
      throw new Error(`Space data not found for ${spaceAddress}`);
    }

    const { symbol, governanceToken, decimals } = spaceDataEntry;

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
    contractAddress: string,
    blockNumber: number,
    block: evm.Block | null,
    helpers: Parameters<evm.Writer>[0]['helpers']
  ) {
    let space = await Space.loadEntity(contractAddress, config.indexerName);
    if (space) return;

    const metadataId = `${contractAddress}_metadata`;

    space = new Space(contractAddress, config.indexerName);
    space.protocol = 'governor-bravo';
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

    const governorModuleContract = new Contract(
      contractAddress,
      GovernorModule,
      provider
    );

    const [quorum, timelock, proposalThreshold] = await Promise.all([
      governorModuleContract.quorumVotes(overrides),
      governorModuleContract.timelock(overrides),
      governorModuleContract.proposalThreshold(overrides)
    ]);

    const timelockContract = new Contract(timelock, Timelock, provider);
    const timelockDelay = await timelockContract.delay(overrides);

    const executionStrategy = new ExecutionStrategy(
      timelock,
      config.indexerName
    );
    executionStrategy.address = timelock;
    executionStrategy.type = 'GovernorBravoTimelock';
    executionStrategy.quorum = quorum.toString();
    executionStrategy.treasury_chain = protocolConfig.chainId;
    executionStrategy.treasury = timelock;
    executionStrategy.timelock_delay = timelockDelay.toString();
    await executionStrategy.save();

    await helpers.executeTemplate('Timelock', {
      contract: timelock,
      start: blockNumber
    });

    const { votingPowerStrategyParsedMetadata } =
      await initializeStrategies(contractAddress);

    space.authenticators = ['GovernorBravoAuthenticator'];
    space.strategies = [evmNetworks[config.indexerName].Strategies.Comp];
    space.strategies_params = ['0xc27427e6B1a112eD59f9dB58c34BC13a7ee76546'];
    space.strategies_indices = [0];
    space.voting_power_validation_strategy_strategies = space.strategies;
    space.voting_power_validation_strategy_strategies_params =
      space.strategies_params;
    space.voting_power_validation_strategies_parsed_metadata = [
      votingPowerStrategyParsedMetadata.id
    ];
    space.proposal_threshold = proposalThreshold.toString();

    const spaceDataEntry = spaceData[contractAddress];
    if (!spaceDataEntry) return;

    const { name, symbol, treasury } = spaceDataEntry;

    const spaceMetadata = new SpaceMetadataItem(metadataId, config.indexerName);
    spaceMetadata.name = name;
    spaceMetadata.voting_power_symbol = symbol;
    spaceMetadata.treasuries = [JSON.stringify(treasury)];
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
    console.log('Handle proposal created');

    if (!event || !rawEvent) return;

    const id = event.args.id.toNumber();
    const spaceAddress = getAddress(rawEvent.address);
    const proposerAddress = getAddress(event.args.proposer);
    const proposalId = `${spaceAddress}/${id}`;
    const proposalMetadataId = `${proposalId}_metadata`;
    const leaderboardId = `${spaceAddress}/${proposerAddress}`;

    await initializeSpace(spaceAddress, blockNumber, block, helpers);
    await initializeUser(proposerAddress, block);

    const spaceDataEntry = spaceData[spaceAddress];
    if (!spaceDataEntry) return;

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    const spaceMetadataItem = space.metadata
      ? await SpaceMetadataItem.loadEntity(space.metadata, config.indexerName)
      : null;

    const executionStrategyAddress =
      spaceMetadataItem?.executors_strategies?.[0];
    if (!executionStrategyAddress) return;

    const executionStrategy = new ExecutionStrategy(
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
    proposal.proposal_id = id;
    proposal.space = space.id;
    proposal.author = proposerAddress;
    proposal.metadata = proposalMetadataId;
    proposal.start = event.args.startBlock.toNumber();
    proposal.min_end = event.args.endBlock.toNumber();
    proposal.max_end = proposal.min_end;
    proposal.snapshot = proposal.start;
    proposal.treasuries = spaceMetadataItem?.treasuries || [];
    proposal.quorum = executionStrategy.quorum;
    proposal.strategies = space.strategies;
    proposal.strategies_params = space.strategies_params;
    proposal.strategies_indices = space.strategies_indices;
    proposal.execution_strategy = executionStrategy.address;
    proposal.execution_strategy_type = executionStrategy.type;
    proposal.execution_strategy_details = executionStrategy.id;
    proposal.vp_decimals = spaceDataEntry.decimals;
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
      leaderboardItem.save()
    ]);
  };

  const handleProposalCanceled: evm.Writer = async ({ event, rawEvent }) => {
    console.log('Handle proposal canceled');

    if (!event || !rawEvent) return;

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
    console.log('Handle proposal queued');

    if (!event || !rawEvent) return;

    const id = event.args.id.toNumber();
    const spaceAddress = getAddress(rawEvent.address);
    const proposalId = `${spaceAddress}/${id}`;

    const proposal = await Proposal.loadEntity(proposalId, config.indexerName);
    if (!proposal) return;

    proposal.executed = true;
    proposal.execution_time = event.args.eta.toNumber();

    await proposal.save();
  };

  const handleProposalExecuted: evm.Writer = async ({ event, rawEvent }) => {
    console.log('Handle proposal executed');

    if (!event || !rawEvent) return;

    const id = event.args.id.toNumber();
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
    console.log('Handle vote cast');

    if (!event || !rawEvent) return;

    const id = event.args.proposalId.toNumber();
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
    vote.vp = event.args.votes.toString();
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
    rawEvent
  }) => {
    console.log('Handle proposal threshold set');

    if (!event || !rawEvent) return;

    const spaceAddress = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.proposal_threshold = event.args.newProposalThreshold.toString();

    await space.save();
  };

  const handleNewAdmin: evm.Writer = async ({ event, rawEvent }) => {
    console.log('Handle new admin');

    if (!event || !rawEvent) return;

    const spaceAddress = getAddress(rawEvent.address);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    space.proposal_threshold = event.args.newAdmin.toString();

    await space.save();
  };

  const handleNewDelay: evm.Writer = async ({ event, rawEvent }) => {
    console.log('Handle new delay');

    if (!event || !rawEvent) return;

    const timelockAddress = getAddress(rawEvent.address);

    const timelock = await ExecutionStrategy.loadEntity(
      timelockAddress,
      config.indexerName
    );
    if (!timelock) return;

    timelock.timelock_delay = event.args.newDelay.toString();

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
