import { getAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { evm } from '@snapshot-labs/checkpoint';
import GovernorModule from './abis/GovernorModule.json';
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
  User,
  Vote,
  VoteMetadataItem
} from '../../../../.checkpoint/models';
import { EVMConfig, GovernorBravoConfig } from '../../types';

const NAME = 'Uniswap';
const SYMBOL = 'UNI';
const DECIMALS = 18;
const TREASURY = {
  name: 'Uniswap Treasury',
  address: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
  chain_id: 1
};

export function createWriters(
  config: EVMConfig,
  protocolConfig: GovernorBravoConfig
) {
  const provider = new StaticJsonRpcProvider(
    config.network_node_url,
    protocolConfig.chainId
  );

  async function initializeSpace(
    contractAddress: string,
    block: evm.Block | null
  ) {
    let space = await Space.loadEntity(contractAddress, config.indexerName);
    if (space) return;

    const metadataId = `${contractAddress}_metadata`;

    const spaceMetadata = new SpaceMetadataItem(metadataId, config.indexerName);
    spaceMetadata.name = NAME;
    spaceMetadata.voting_power_symbol = SYMBOL;
    spaceMetadata.treasuries = [JSON.stringify(TREASURY)];
    await spaceMetadata.save();

    space = new Space(contractAddress, config.indexerName);
    space.protocol = 'governor-bravo';
    space.verified = true;
    space.link = getSpaceLink({
      networkId: config.indexerName,
      spaceId: contractAddress
    });
    space.metadata = metadataId;
    space.created = block?.timestamp ?? getCurrentTimestamp();
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
    rawEvent
  }) => {
    console.log('Handle proposal created');

    if (!event || !rawEvent) return;

    const id = event.args.id.toNumber();
    const spaceAddress = getAddress(rawEvent.address);
    const proposerAddress = getAddress(event.args.proposer);
    const proposalId = `${spaceAddress}/${id}`;
    const proposalMetadataId = `${proposalId}_metadata`;
    const leaderboardId = `${spaceAddress}/${proposerAddress}`;

    await initializeSpace(spaceAddress, block);
    await initializeUser(proposerAddress, block);

    const space = await Space.loadEntity(spaceAddress, config.indexerName);
    if (!space) return;

    const spaceMetadataItem = space.metadata
      ? await SpaceMetadataItem.loadEntity(space.metadata, config.indexerName)
      : null;

    const governorModuleContract = new Contract(
      spaceAddress,
      GovernorModule,
      provider
    );

    const overrides = {
      blockTag: blockNumber
    };

    const [quorum, timelock] = await Promise.all([
      governorModuleContract.quorumVotes(overrides),
      governorModuleContract.timelock(overrides)
    ]);

    const executionStrategy = new ExecutionStrategy(
      `${proposalId}_execution_strategy`,
      config.indexerName
    );
    executionStrategy.address = timelock;
    executionStrategy.type = 'SimpleQuorumTimelock';
    executionStrategy.quorum = quorum.toString();
    executionStrategy.treasury_chain = protocolConfig.chainId;
    executionStrategy.treasury = timelock;
    executionStrategy.timelock_delay = 0n;

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
    proposal.execution_strategy = executionStrategy.address;
    proposal.execution_strategy_type = executionStrategy.type;
    proposal.execution_strategy_details = executionStrategy.id;
    proposal.vp_decimals = DECIMALS;
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

    const execution = targets.map((target, index) => ({
      _type: 'raw',
      _form: {
        recipient: target
      },
      to: target,
      data: calldatas[index] ?? '0x',
      value: '0',
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
      executionStrategy.save(),
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

  return {
    handleProposalCreated,
    handleProposalCanceled,
    handleProposalQueued,
    handleProposalExecuted,
    handleVoteCast
  };
}
