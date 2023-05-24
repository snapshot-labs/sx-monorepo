import randomBytes from 'randombytes';
import { AbiCoder } from '@ethersproject/abi';
import { Contract, ContractFactory, ContractInterface } from '@ethersproject/contracts';
import { EthereumTx } from '../../../src/clients/evm/ethereum-tx';
import ProxyFactoryContract from './fixtures/ProxyFactory.json';
import SpaceContract from './fixtures/Space.json';
import AvatarContract from './fixtures/Avatar.json';
import CompTokenContract from './fixtures/CompToken.json';
import Erc20VotesTokenContract from './fixtures/Erc20VotesToken.json';
import VanillaAuthenciatorContract from './fixtures/VanillaAuthenticator.json';
import EthTxAuthenticatorContract from './fixtures/EthTxAuthenticator.json';
import EthSigAuthenticatorContract from './fixtures/EthSigAuthenticator.json';
import VanillaProposalValidationStrategyContract from './fixtures/VanillaProposalValidationStrategy.json';
import VotingPowerProposalValidationStrategyContract from './fixtures/VotingPowerProposalValidationStrategy.json';
import VanillaVotingStrategyContract from './fixtures/VanillaVotingStrategy.json';
import CompVotingStrategyContract from './fixtures/CompVotingStrategy.json';
import OzVotesVotingStrategyContract from './fixtures/OzVotesVotingStrategy.json';
import WhitelistVotingStrategyContract from './fixtures/WhitelistVotingStrategy.json';
import VanillaExecutionStrategyContract from './fixtures/VanillaExecutionStrategy.json';
import AvatarExecutionStrategyContract from './fixtures/AvatarExecutionStrategy.json';
import TimelockExecutionStrategyContract from './fixtures/TimelockExecutionStrategy.json';
import type { Signer } from '@ethersproject/abstract-signer';
import type { EvmNetworkConfig } from '../../../src/types';

export type TestConfig = {
  controller: string;
  proxyFactory: string;
  spaceAddress: string;
  compToken: string;
  vanillaAuthenticator: string;
  ethTxAuthenticator: string;
  ethSigAuthenticator: string;
  vanillaProposalValidationStrategy: string;
  votingPowerProposalValidationStrategy: string;
  vanillaVotingStrategy: string;
  compVotingStrategy: string;
  ozVotesVotingStrategy: string;
  whitelistVotingStrategy: string;
  vanillaExecutionStrategy: string;
  avatarExecutionStrategy: string;
  timelockExecutionStrategy: string;
  networkConfig: EvmNetworkConfig;
};

type ContractDetails = {
  abi: ContractInterface;
  bytecode: {
    object: string;
  };
};

const COMP_TOKEN_DECIMALS = 18n;

export async function deployDependency(
  signer: Signer,
  contractDetails: ContractDetails,
  ...args: any[]
) {
  const factory = new ContractFactory(contractDetails.abi, contractDetails.bytecode.object, signer);

  const contract = await factory.deploy(...args);

  return contract.address;
}

export async function setup(signer: Signer): Promise<TestConfig> {
  const precomputedSpaceSalt = `0x${randomBytes(32).toString('hex')}`;

  const controller = await signer.getAddress();

  const avatar = await deployDependency(signer, AvatarContract);
  const compToken = await deployDependency(signer, CompTokenContract);
  const erc20VotesToken = await deployDependency(signer, Erc20VotesTokenContract, 'VOTES', 'VOTES');
  const proxyFactory = await deployDependency(signer, ProxyFactoryContract);
  const masterSpace = await deployDependency(signer, SpaceContract);
  const vanillaAuthenticator = await deployDependency(signer, VanillaAuthenciatorContract);
  const ethTxAuthenticator = await deployDependency(signer, EthTxAuthenticatorContract);
  const ethSigAuthenticator = await deployDependency(
    signer,
    EthSigAuthenticatorContract,
    'snapshot-x',
    '0.1.0'
  );
  const vanillaProposalValidationStrategy = await deployDependency(
    signer,
    VanillaProposalValidationStrategyContract
  );
  const votingPowerProposalValidationStrategy = await deployDependency(
    signer,
    VotingPowerProposalValidationStrategyContract
  );
  const vanillaVotingStrategy = await deployDependency(signer, VanillaVotingStrategyContract);
  const compVotingStrategy = await deployDependency(signer, CompVotingStrategyContract);
  const ozVotesVotingStrategy = await deployDependency(signer, OzVotesVotingStrategyContract);
  const whitelistVotingStrategy = await deployDependency(signer, WhitelistVotingStrategyContract);
  const vanillaExecutionStrategy = await deployDependency(
    signer,
    VanillaExecutionStrategyContract,
    1
  );
  const masterAvatarExecutionStrategy = await deployDependency(
    signer,
    AvatarExecutionStrategyContract,
    controller,
    avatar,
    [],
    1
  );
  const masterTimelockExecutionStrategy = await deployDependency(
    signer,
    TimelockExecutionStrategyContract,
    controller,
    controller,
    [],
    0,
    1
  );

  const networkConfig = {
    eip712ChainId: 31337,
    proxyFactory,
    masterSpace,
    executionStrategiesImplementations: {
      SimpleQuorumAvatar: masterAvatarExecutionStrategy,
      SimpleQuorumTimelock: masterTimelockExecutionStrategy
    },
    authenticators: {
      [vanillaAuthenticator]: {
        type: 'vanilla'
      },
      [ethTxAuthenticator]: {
        type: 'ethTx'
      },
      [ethSigAuthenticator]: {
        type: 'ethSig'
      }
    },
    strategies: {
      [vanillaVotingStrategy]: {
        type: 'vanilla'
      },
      [compVotingStrategy]: {
        type: 'comp'
      },
      [ozVotesVotingStrategy]: {
        type: 'ozVotes'
      },
      [whitelistVotingStrategy]: {
        type: 'whitelist'
      }
    }
  } as const;

  const ethTxClient = new EthereumTx({ networkConfig });
  const spaceAddress = await ethTxClient.predictSpaceAddress({
    signer,
    salt: precomputedSpaceSalt
  });

  const { address: avatarExecutionStrategy } = await ethTxClient.deployAvatarExecution({
    signer,
    params: {
      controller,
      target: avatar,
      spaces: [spaceAddress],
      quorum: 1n
    }
  });

  const { address: timelockExecutionStrategy } = await ethTxClient.deployTimelockExecution({
    signer,
    params: {
      controller,
      vetoGuardian: controller,
      spaces: [spaceAddress],
      timelockDelay: 0n,
      quorum: 1n
    }
  });

  const avatarContract = new Contract(avatar, AvatarContract.abi, signer);
  await avatarContract.enableModule(avatarExecutionStrategy);

  const compTokenContract = new Contract(compToken, CompTokenContract.abi, signer);
  await compTokenContract.mint(controller, 2n * 10n ** COMP_TOKEN_DECIMALS);
  await compTokenContract.delegate(controller);

  const erc20VotesTokenContract = new Contract(
    erc20VotesToken,
    Erc20VotesTokenContract.abi,
    signer
  );
  await erc20VotesTokenContract.mint(controller, 2n * 10n ** COMP_TOKEN_DECIMALS);
  await erc20VotesTokenContract.delegate(controller);

  await signer.sendTransaction({
    to: avatar,
    value: '21'
  });

  await signer.sendTransaction({
    to: timelockExecutionStrategy,
    value: '21'
  });

  const whitelist = [
    {
      addr: controller,
      vp: 1n
    }
  ];

  const abiCoder = new AbiCoder();
  const whitelistVotingStrategyParams = abiCoder.encode(
    ['tuple(address addr, uint256 vp)[]'],
    [whitelist]
  );

  const res = await ethTxClient.deploySpace({
    signer,
    params: {
      controller,
      votingDelay: 0,
      minVotingDuration: 0,
      maxVotingDuration: 86400,
      proposalValidationStrategy: {
        addr: votingPowerProposalValidationStrategy,
        params: abiCoder.encode(
          ['uint256', 'tuple(address addr, bytes params)[]'],
          [
            1,
            [
              {
                addr: vanillaVotingStrategy,
                params: '0x00'
              },
              {
                addr: compVotingStrategy,
                params: compToken
              },
              {
                addr: ozVotesVotingStrategy,
                params: erc20VotesToken
              },
              {
                addr: whitelistVotingStrategy,
                params: whitelistVotingStrategyParams
              }
            ]
          ]
        )
      },
      proposalValidationStrategyMetadataUri: 'proposalValidationStrategyMetadataUri',
      daoUri: 'daoUri',
      metadataUri: 'metadataUri',
      authenticators: [vanillaAuthenticator, ethTxAuthenticator, ethSigAuthenticator],
      votingStrategies: [
        {
          addr: vanillaVotingStrategy,
          params: '0x00'
        },
        {
          addr: compVotingStrategy,
          params: compToken
        },
        {
          addr: ozVotesVotingStrategy,
          params: erc20VotesToken
        },
        {
          addr: whitelistVotingStrategy,
          params: whitelistVotingStrategyParams
        }
      ],
      votingStrategiesMetadata: ['0x00', `0x${COMP_TOKEN_DECIMALS.toString(16)}`, '0x00', '0x00']
    },
    salt: precomputedSpaceSalt
  });

  return {
    controller,
    compToken: compToken,
    proxyFactory,
    spaceAddress: res.address,
    vanillaAuthenticator,
    ethTxAuthenticator,
    ethSigAuthenticator,
    vanillaProposalValidationStrategy,
    votingPowerProposalValidationStrategy,
    vanillaVotingStrategy,
    compVotingStrategy,
    ozVotesVotingStrategy,
    whitelistVotingStrategy,
    vanillaExecutionStrategy,
    avatarExecutionStrategy,
    timelockExecutionStrategy,
    networkConfig
  };
}
