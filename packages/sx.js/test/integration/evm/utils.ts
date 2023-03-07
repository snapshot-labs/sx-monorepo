import { AbiCoder } from '@ethersproject/abi';
import { Contract, ContractFactory, ContractInterface } from '@ethersproject/contracts';
import { EthereumTx } from '../../../src/clients/evm/ethereum-tx';
import SpaceFactoryContract from './fixtures/SpaceFactory.json';
import AvatarContract from './fixtures/Avatar.json';
import CompTokenContract from './fixtures/CompToken.json';
import VanillaAuthenciatorContract from './fixtures/VanillaAuthenticator.json';
import EthTxAuthenticatorContract from './fixtures/EthTxAuthenticator.json';
import EthSigAuthenticatorContract from './fixtures/EthSigAuthenticator.json';
import VanillaVotingStrategyContract from './fixtures/VanillaVotingStrategy.json';
import CompVotingStrategy from './fixtures/CompVotingStrategy.json';
import WhitelistStrategy from './fixtures/WhitelistStrategy.json';
import VanillaExecutionStrategyContract from './fixtures/VanillaExecutionStrategy.json';
import AvatarExecutionStrategyContract from './fixtures/AvatarExecutionStrategy.json';
import type { Signer } from '@ethersproject/abstract-signer';
import type { NetworkConfig } from '../../../src/types';

export type TestConfig = {
  controller: string;
  spaceFactory: string;
  spaceAddress: string;
  compToken: string;
  vanillaAuthenticator: string;
  ethTxAuthenticator: string;
  ethSigAuthenticator: string;
  vanillaVotingStrategy: string;
  compVotingStrategy: string;
  whitelistStrategy: string;
  vanillaExecutionStrategy: string;
  avatarExecutionStrategy: string;
  networkConfig: NetworkConfig;
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
  const controller = await signer.getAddress();

  const avatar = await deployDependency(signer, AvatarContract);
  const compToken = await deployDependency(signer, CompTokenContract);
  const spaceFactory = await deployDependency(signer, SpaceFactoryContract);
  const vanillaAuthenticator = await deployDependency(signer, VanillaAuthenciatorContract);
  const ethTxAuthenticator = await deployDependency(signer, EthTxAuthenticatorContract);
  const ethSigAuthenticator = await deployDependency(
    signer,
    EthSigAuthenticatorContract,
    'snapshot-x',
    '0.1.0'
  );
  const vanillaVotingStrategy = await deployDependency(signer, VanillaVotingStrategyContract);
  const compVotingStrategy = await deployDependency(signer, CompVotingStrategy);
  const whitelistStrategy = await deployDependency(signer, WhitelistStrategy);
  const vanillaExecutionStrategy = await deployDependency(signer, VanillaExecutionStrategyContract);
  const avatarExecutionStrategy = await deployDependency(
    signer,
    AvatarExecutionStrategyContract,
    controller,
    avatar,
    []
  );

  const avatarContract = new Contract(avatar, AvatarContract.abi, signer);
  const avatarExecutionStrategyContract = new Contract(
    avatarExecutionStrategy,
    AvatarExecutionStrategyContract.abi,
    signer
  );

  await avatarContract.enableModule(avatarExecutionStrategy);

  const compTokenContract = new Contract(compToken, CompTokenContract.abi, signer);
  await compTokenContract.mint(controller, 2n * 10n ** COMP_TOKEN_DECIMALS);
  await compTokenContract.delegate(controller);

  await signer.sendTransaction({
    to: avatar,
    value: '21'
  });

  const networkConfig = {
    eip712ChainId: 31337,
    spaceFactory,
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
      [whitelistStrategy]: {
        type: 'whitelist'
      }
    },
    executors: {
      [vanillaExecutionStrategy]: {
        type: 'vanilla'
      },
      [avatarExecutionStrategy]: {
        type: 'avatar'
      }
    }
  } as const;

  const ethTxClient = new EthereumTx({ networkConfig });

  const whitelist = [
    {
      addy: controller,
      vp: 1n
    }
  ];

  const abiCoder = new AbiCoder();

  const res = await ethTxClient.deploySpace({
    signer,
    controller,
    votingDelay: 0,
    minVotingDuration: 0,
    maxVotingDuration: 86400,
    proposalThreshold: 1n,
    metadataUri: 'metadataUri',
    authenticators: [vanillaAuthenticator, ethTxAuthenticator, ethSigAuthenticator],
    votingStrategies: [
      {
        addy: vanillaVotingStrategy,
        params: '0x00'
      },
      {
        addy: compVotingStrategy,
        params: compToken
      },
      {
        addy: whitelistStrategy,
        params: abiCoder.encode(['tuple(address addy, uint256 vp)[]'], [whitelist])
      }
    ],
    votingStrategiesMetadata: ['0x00', `0x${COMP_TOKEN_DECIMALS.toString(16)}`, '0x00'],
    executionStrategies: [
      {
        addy: vanillaExecutionStrategy,
        params: '0x0000000000000000000000000000000000000000000000000000000000000001'
      },
      {
        addy: avatarExecutionStrategy,
        params: '0x0000000000000000000000000000000000000000000000000000000000000001'
      }
    ]
  });

  await avatarExecutionStrategyContract.enableSpace(res.spaceAddress);

  return {
    controller,
    compToken: compToken,
    spaceFactory,
    spaceAddress: res.spaceAddress,
    vanillaAuthenticator,
    ethTxAuthenticator,
    ethSigAuthenticator,
    vanillaVotingStrategy,
    compVotingStrategy,
    whitelistStrategy,
    vanillaExecutionStrategy,
    avatarExecutionStrategy,
    networkConfig
  };
}
