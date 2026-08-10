import { evm } from '@snapshot-labs/checkpoint';
import { evmNetworks, utils } from '@snapshot-labs/sx';
import { createPublicClient, getAddress, http, keccak256, toHex } from 'viem';
import GovernorModuleAbi from './abis/GovernorModule';
import TimelockAbi from './abis/Timelock';
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
  updateScoresTick
} from '../../../common/utils';
import { EVMConfig, GovernorBravoConfig } from '../../types';
import { getTimestampFromBlock as _getTimestampFromBlock } from '../../utils';
import {
  convertChoice,
  getProposalBody,
  getProposalTitle
} from '../openzeppelin/utils';

type SpaceData = {
  name: string;
  about?: string;
  avatar?: string;
  externalUrl?: string;
  github?: string;
  twitter?: string;
  farcaster?: string;
  symbol: string;
  decimals: number;
  governanceToken: string;
  verified?: boolean;
  treasury: {
    name: string;
    address: string;
    chain_id: number;
  };
};

const spaceData: Record<string, SpaceData | undefined> = {
  '0x408ED6354d4973f66138C91495F2f2FCbd8724C3': {
    name: 'Uniswap',
    about:
      'The largest onchain marketplace. Buy and sell crypto on Ethereum and 14+ other chains.',
    avatar:
      'ipfs://bafkreigzzj4yc3khx4mn2zmdrdgtvae3s36e5ae2sgry2azuqvxfakjuoa',
    externalUrl: 'https://app.uniswap.org',
    github: 'uniswap',
    twitter: 'Uniswap',
    farcaster: 'uniswap',
    symbol: 'UNI',
    decimals: 18,
    governanceToken: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    verified: true,
    treasury: {
      name: 'Timelock',
      address: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
      chain_id: 1
    }
  },
  '0xc0Da02939E1441F497fd74F78cE7Decb17B66529': {
    name: 'Compound',
    about: 'Building infrastructure for the future of finance.',
    avatar:
      'ipfs://bafkreia4lin2o6uux2375uhekvgqlr466tes7gsdzg6aldakw5jicylcd4',
    externalUrl: 'https://compound.finance',
    github: 'compound-finance',
    twitter: 'compoundfinance',
    symbol: 'COMP',
    decimals: 18,
    governanceToken: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
    verified: true,
    treasury: {
      name: 'Timelock',
      address: '0x6d903f6003cca6255D85CcA4D3B5E5146dC33925',
      chain_id: 1
    }
  },
  '0x69112D158A607DD388034c0C09242FF966985258': {
    name: 'Sepolia Governor Bravo',
    symbol: 'MOCK',
    decimals: 18,
    governanceToken: '0xc27427e6B1a112eD59f9dB58c34BC13a7ee76546',
    verified: true,
    treasury: {
      name: 'Timelock',
      address: '0x52f26d07f8fEf1CF806A53159ce68bf1B4031baB',
      chain_id: 11155111
    }
  },
  '0x0204Cd037B2ec03605CFdFe482D8e257C765fA1B': {
    name: 'InstaDapp',
    about:
      "The world's most advanced platform to start leveraging the full potential of Decentralised Finance.",
    avatar:
      'ipfs://bafkreiasyhlnhknguom4n4yiaycppursassbqazpc7gze7ol5d7enjgk5a',
    symbol: 'FLUID',
    decimals: 18,
    governanceToken: '0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb',
    treasury: {
      name: 'Timelock',
      address: '0x2386DC45AdDed673317eF068992F19421B481F4c',
      chain_id: 1
    }
  },
  '0x91d9c2b5cF81D55a5f2Ecc0fC84E62f9cd2ceFd6': {
    name: 'Rari Capital',
    about:
      'Yield aggregation, Fuse, tranches, governance — we are here to build Finance 2.0.',
    avatar:
      'ipfs://bafkreihpjg7f3uqizahy7kqxyjmxw4a5hymqzs3ohx2ecw356seycsebxm',
    symbol: 'RGT',
    decimals: 18,
    governanceToken: '0xD291E7a03283640FDc51b121aC401383A46cC623',
    treasury: {
      name: 'Timelock',
      address: '0x8ace03Fc45139fDDba944c6A4082b604041d19FC',
      chain_id: 1
    }
  },
  '0x8a994C6F55Be1fD2B4d0dc3B8f8F7D4E3a2dA8F1': {
    name: 'Ampleforth',
    about:
      'Connect with the community developing digital public goods, creating financial freedom, and defining the future of the open web',
    avatar:
      'ipfs://bafkreieuuri43lqn6zlllhqvidgbqj4tvmhucbldoeoehuqsms77uwfmhe',
    symbol: 'FORTH',
    decimals: 18,
    governanceToken: '0x77FbA179C79De5B7653F68b5039Af940AdA60ce0',
    treasury: {
      name: 'Timelock',
      address: '0x223592a191ECfC7FDC38a9256c3BD96E771539A9',
      chain_id: 1
    }
  },
  '0x3D5Fc645320be0A085A32885F078F7121e5E5375': {
    name: 'Idle DAO',
    about:
      'Idle Finance is a decentralized protocol dedicated to bringing automatic asset allocation and yield aggregation to the interest-bearing tokens economy.',
    avatar:
      'ipfs://bafkreibdu3dd7wdfvi3r7eava7gz2jtbm73agr2nnz2etlxfgt5yx67foq',
    twitter: 'idlefinance',
    symbol: 'IDLE',
    decimals: 18,
    governanceToken: '0x875773784Af8135eA0ef43b5a374AaD105c5D39e',
    treasury: {
      name: 'Timelock',
      address: '0xD6dABBc2b275114a2366555d6C481EF08FDC2556',
      chain_id: 1
    }
  },
  '0x7a6BBe7fDd793CC9ab7e0fc33605FCd2D19371E8': {
    name: 'Reflexer Ungovernor',
    about:
      'Governs the few remaining mutable parameters in the RAI protocol as well as the protocol treasury.',
    avatar:
      'ipfs://bafkreib76xwwpqvtbdedrs5brz3ilwzhse5e3nokbeemoexbyiespgjkty',
    twitter: 'reflexerfinance',
    symbol: 'FLX',
    decimals: 18,
    governanceToken: '0x6243d8CEA23066d098a15582d81a598b4e8391F4',
    treasury: {
      name: 'Timelock',
      address: '0x2cDE6A1147B0EE61726b86d83Fd548401B1162c7',
      chain_id: 1
    }
  },
  '0xEA5eDeF17c4FCE9C120790F3c54D6E04823dE587': {
    name: 'Ease',
    about:
      'Through ezTokens, Ease provides the easiest, cheapest, and safest way to DeFi safely.',
    avatar:
      'ipfs://bafkreigwkdosyw43kdarmil7aiu3b34552a3ixgtdgilq7jtrejpfbqjuq',
    twitter: 'easedefi',
    symbol: 'gvEase',
    decimals: 18,
    governanceToken: '0xEa5edeF1eDB2f47B9637c029A6aC3b80a7ae1550',
    treasury: {
      name: 'Timelock',
      address: '0xEA5edEf1401e8C312c797c27a9842e03Eb0e557a',
      chain_id: 1
    }
  },
  '0x2BbEbFECA0fEbde8C70EF8501C991f3AB2095862': {
    name: 'Public Nouns',
    about: 'Public Nouns is an experimental new way to support public goods.',
    avatar:
      'ipfs://bafkreig66dudkcinghoyyf4umbuuuqcbgyvccwzm6w2ktqpknppze6jgoe',
    twitter: 'publicnouns',
    symbol: '℗NOUN',
    decimals: 0,
    governanceToken: '0x93ecac71499147627DFEc6d0E494d50fCFFf10EE',
    treasury: {
      name: 'Timelock',
      address: '0x553826Cb0D0Ee63155920F42b4E60aaE6607DFCB',
      chain_id: 1
    }
  },
  '0x336505EC1BcC1A020EeDe459f57581725D23465A': {
    name: 'Ondo DAO',
    about:
      'DAO which governs Ondo and affiliated products, including Flux Finance',
    avatar:
      'ipfs://bafkreia6zeihr3qm72yawpgur5h25szkxkalf77uk6eaaz7q52u2dodydi',
    twitter: 'OndoFoundation',
    symbol: 'ONDO',
    decimals: 18,
    governanceToken: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3',
    treasury: {
      name: 'Timelock',
      address: '0x2c5898da4DF1d45EAb2B7B192a361C3b9EB18d9c',
      chain_id: 1
    }
  },
  '0x41FA7898cC5067Eb1ee73A2205eE30cC514D6C71': {
    name: 'DAFO Club',
    about:
      'On paper, DAFO, which stands for Decentralized Autonomous Fashion Organization, is a DAO governed by #dafounders. The DAFO.club is all about co-creating meaningful and disruptive capabilities for the fashion industry.',
    avatar:
      'ipfs://bafkreid46vtzktnxobcdbzyy7ls3m5gzi3u2swzone66qjubmnmpm4j2ke',
    twitter: 'metaDAFO',
    symbol: 'DAFO',
    decimals: 0,
    governanceToken: '0xDad912c673F675e7cDA7eeA5931BeB189001dd8e',
    treasury: {
      name: 'Timelock',
      address: '0x1Fa6221FA6A70cD9BcA9d553A5f2E16Ba8706493',
      chain_id: 1
    }
  },
  '0xef0A0421Ea43b602E5Be35e9018Dd3E34Bcee007': {
    name: 'Hifi DAO',
    about: 'Hifi is a fixed-rate, fixed-term lending protocol.',
    avatar:
      'ipfs://bafkreidxja3zioevyfbaosrcgnyqhgrvtf47hlxumqkdn42lntqbsh2x2m',
    externalUrl: 'https://hifi.finance/',
    twitter: 'HifiFinance',
    symbol: 'HIFI',
    decimals: 18,
    governanceToken: '0x4b9278b94a1112cAD404048903b8d343a810B07e',
    treasury: {
      name: 'Timelock',
      address: '0xAC46Db50B44BBeF8DC25f778359e1834248147F7',
      chain_id: 1
    }
  },
  '0xA905f9f0b525420d4E5214E73d70dfFe8438D8C8': {
    name: 'Amphora DAO',
    about:
      'The governor contract for Amphora DAO allows token holders to manage key parameters for the decentralized Amphora Protocol (amphorafinance.com)',
    avatar:
      'ipfs://bafkreiduf23nmdl5trpxdac3axipug3ag45jybl3ublyhewkin22fzrvki',
    twitter: 'amphoraprotocol',
    symbol: 'AMPH',
    decimals: 18,
    governanceToken: '0x943c5F4F54509d1e78B1fCD93B92c43ce83d3141',
    treasury: {
      name: 'Timelock',
      address: '0xA905f9f0b525420d4E5214E73d70dfFe8438D8C8',
      chain_id: 1
    }
  },
  '0x2f8da73e52Ec56FeB0aE63FBDD50c01dd04E8CC9': {
    name: 'SpellsDAO',
    about: 'Make magic',
    avatar:
      'ipfs://bafkreibvtpldigxul2oxgoo6oaacunwyctu2bm23zfnvbqaew22nxi3irm',
    twitter: 'spellsdao',
    symbol: 'SPELL',
    decimals: 0,
    governanceToken: '0x7fef3f3364C7d8B9BFabB1b24D5CE92A402c6Bd3',
    treasury: {
      name: 'Timelock',
      address: '0x7ffaDE939718122c400435F86621bEA949591c48',
      chain_id: 1
    }
  }
};

export function createWriters(
  config: EVMConfig,
  protocolConfig: GovernorBravoConfig
) {
  const client = createPublicClient({
    transport: http(config.network_node_url)
  });

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
    space.verified = spaceData[contractAddress]?.verified ?? false;
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

    const spaceDataEntry = spaceData[contractAddress];
    if (!spaceDataEntry) return;

    const { name, symbol, treasury, governanceToken } = spaceDataEntry;

    const compStrategy = evmNetworks[config.indexerName].Strategies.Comp;
    if (!compStrategy) throw new Error('Comp strategy is not configured');

    space.authenticators = [
      'GovernorBravoAuthenticator',
      'GovernorBravoAuthenticatorSignature'
    ];
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
    spaceMetadata.about = spaceDataEntry.about || '';
    spaceMetadata.avatar = spaceDataEntry.avatar || '';
    spaceMetadata.external_url = spaceDataEntry.externalUrl || '';
    spaceMetadata.twitter = spaceDataEntry.twitter || '';
    spaceMetadata.github = spaceDataEntry.github || '';
    spaceMetadata.farcaster = spaceDataEntry.farcaster || '';
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
    proposal.vp_decimals = spaceDataEntry.decimals;
    proposal.type = 'basic';
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
