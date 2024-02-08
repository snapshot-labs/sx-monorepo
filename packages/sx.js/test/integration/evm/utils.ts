import randomBytes from 'randombytes';
import { AbiCoder } from '@ethersproject/abi';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract, ContractFactory, ContractInterface } from '@ethersproject/contracts';
import { EthereumTx } from '../../../src/clients/evm/ethereum-tx';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
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
import MerkleWhitelistVotingStrategyContract from './fixtures/MerkleWhitelistVotingStrategy.json';
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
  merkleWhitelistVotingStrategy: string;
  vanillaExecutionStrategy: string;
  avatarExecutionStrategy: string;
  timelockExecutionStrategy: string;
  merkleWhitelistStrategyMetadata: {
    tree: {
      address: string;
      votingPower: bigint;
    }[];
  };
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

export async function setup(provider: JsonRpcProvider, signer: Signer): Promise<TestConfig> {
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
    '1.0.0'
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
  const merkleWhitelistVotingStrategy = await deployDependency(
    signer,
    MerkleWhitelistVotingStrategyContract
  );

  const vanillaExecutionStrategy = await deployDependency(
    signer,
    VanillaExecutionStrategyContract,
    controller,
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
    TimelockExecutionStrategyContract
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
      [merkleWhitelistVotingStrategy]: {
        type: 'whitelist'
      }
    }
  } as const;

  const ethTxClient = new EthereumTx({ networkConfig });
  const spaceAddress = await ethTxClient.predictSpaceAddress({
    signer,
    saltNonce: precomputedSpaceSalt
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

  const avatarContract = new Contract(avatar, AvatarContract.abi, signer);
  await avatarContract.enableModule(avatarExecutionStrategy);

  const whitelist = [[controller, 1n]] as [string, bigint][];
  const merkleWhitelistStrategyMetadata = {
    tree: whitelist.map(([address, votingPower]) => ({
      address,
      votingPower
    }))
  };

  const tree = StandardMerkleTree.of(whitelist, ['address', 'uint96']);

  const abiCoder = new AbiCoder();
  const whitelistVotingStrategyParams = abiCoder.encode(['bytes32'], [tree.root]);

  await ethTxClient.deploySpace({
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
                addr: merkleWhitelistVotingStrategy,
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
          addr: merkleWhitelistVotingStrategy,
          params: whitelistVotingStrategyParams
        }
      ],
      votingStrategiesMetadata: ['0x00', `0x${COMP_TOKEN_DECIMALS.toString(16)}`, '0x00', '0x00']
    },
    saltNonce: precomputedSpaceSalt
  });

  return {
    controller,
    compToken: compToken,
    proxyFactory,
    spaceAddress,
    vanillaAuthenticator,
    ethTxAuthenticator,
    ethSigAuthenticator,
    vanillaProposalValidationStrategy,
    votingPowerProposalValidationStrategy,
    vanillaVotingStrategy,
    compVotingStrategy,
    ozVotesVotingStrategy,
    merkleWhitelistVotingStrategy,
    vanillaExecutionStrategy,
    avatarExecutionStrategy,
    timelockExecutionStrategy,
    merkleWhitelistStrategyMetadata,
    networkConfig
  };
}
