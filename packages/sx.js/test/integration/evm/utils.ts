import { Contract, ContractFactory, ContractInterface } from '@ethersproject/contracts';
import SpaceFactoryContract from './fixtures/SpaceFactory.json';
import CompTokenContract from './fixtures/CompToken.json';
import VanillaAuthenciatorContract from './fixtures/VanillaAuthenticator.json';
import EthTxAuthenticatorContract from './fixtures/EthTxAuthenticator.json';
import EthSigAuthenticatorContract from './fixtures/EthSigAuthenticator.json';
import VanillaVotingStrategyContract from './fixtures/VanillaVotingStrategy.json';
import CompVotingStrategy from './fixtures/CompVotingStrategy.json';
import WhitelistStrategy from './fixtures/WhitelistStrategy.json';
import VanillaExecutionStrategyContract from './fixtures/VanillaExecutionStrategy.json';
import type { Signer } from '@ethersproject/abstract-signer';
import type { NetworkConfig } from '../../../src/types';

export type TestConfig = {
  compToken: string;
  spaceFactory: string;
  vanillaAuthenticator: string;
  ethTxAuthenticator: string;
  ethSigAuthenticator: string;
  vanillaVotingStrategy: string;
  compVotingStrategy: string;
  whitelistStrategy: string;
  executionStrategy: string;
  networkConfig: NetworkConfig;
};

type ContractDetails = {
  abi: ContractInterface;
  bytecode: {
    object: string;
  };
};

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
  const user = await signer.getAddress();

  const compToken = await deployDependency(signer, CompTokenContract);
  const spaceFactory = await deployDependency(signer, SpaceFactoryContract);
  const vanillaAuthenticator = await deployDependency(signer, VanillaAuthenciatorContract);
  const ethTxAuthenticator = await deployDependency(signer, EthTxAuthenticatorContract);
  const ethSigAuthenticator = await deployDependency(
    signer,
    EthSigAuthenticatorContract,
    'snapshot-x',
    '1'
  );
  const vanillaVotingStrategy = await deployDependency(signer, VanillaVotingStrategyContract);
  const compVotingStrategy = await deployDependency(signer, CompVotingStrategy);
  const whitelistStrategy = await deployDependency(signer, WhitelistStrategy);
  const executionStrategy = await deployDependency(signer, VanillaExecutionStrategyContract);

  const compTokenContract = new Contract(compToken, CompTokenContract.abi, signer);
  await compTokenContract.mint(user, 1);
  await compTokenContract.delegate(user);

  return {
    compToken: compToken,
    spaceFactory,
    vanillaAuthenticator,
    ethTxAuthenticator,
    ethSigAuthenticator,
    vanillaVotingStrategy,
    compVotingStrategy,
    whitelistStrategy,
    executionStrategy,
    networkConfig: {
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
        [executionStrategy]: {
          type: 'vanilla'
        }
      }
    }
  };
}
