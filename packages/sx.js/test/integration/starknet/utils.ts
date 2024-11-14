import { Signer } from '@ethersproject/abstract-signer';
import {
  Contract,
  ContractFactory,
  ContractInterface
} from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { Account, CallData, RpcProvider, uint256 } from 'starknet';
import GnosisSafeL2Contract from './fixtures/l1/GnosisSafeL2.json';
import GnosisSafeProxyFactoryContract from './fixtures/l1/GnosisSafeProxyFactory.json';
import L1AvatarExecutionStrategyFactoryContract from './fixtures/l1/L1AvatarExecutionStrategyFactory.json';
import L1AvatarExecutionStrategyMockMessagingContract from './fixtures/l1/L1AvatarExecutionStrategyMockMessaging.json';
import MockStarknetMessaging from './fixtures/l1/MockStarknetMessaging.json';
import StarknetCommit from './fixtures/l1/StarknetCommit.json';
import sxErc20VotesPresetCasm from './fixtures/sx_ERC20VotesPreset.casm.json';
import sxErc20VotesPresetSierra from './fixtures/sx_ERC20VotesPreset.sierra.json';
import sxErc20VotesVotingStrategyCasm from './fixtures/sx_ERC20VotesVotingStrategy.casm.json';
import sxErc20VotesVotingStrategySierra from './fixtures/sx_ERC20VotesVotingStrategy.sierra.json';
import sxEthRelayerExecutionStrategyCasm from './fixtures/sx_EthRelayerExecutionStrategy.casm.json';
import sxEthRelayerExecutionStrategySierra from './fixtures/sx_EthRelayerExecutionStrategy.sierra.json';
import sxEthSigAuthenticatorCasm from './fixtures/sx_EthSigAuthenticator.casm.json';
import sxEthSigAuthenticatorSierra from './fixtures/sx_EthSigAuthenticator.sierra.json';
import sxEthTxAuthenticatorCasm from './fixtures/sx_EthTxAuthenticator.casm.json';
import sxEthTxAuthenticatorSierra from './fixtures/sx_EthTxAuthenticator.sierra.json';
import sxFactoryCasm from './fixtures/sx_Factory.casm.json';
import sxFactorySierra from './fixtures/sx_Factory.sierra.json';
import sxMerkleWhitelistVotingStrategyCasm from './fixtures/sx_MerkleWhitelistVotingStrategy.casm.json';
import sxMerkleWhitelistVotingStrategySierra from './fixtures/sx_MerkleWhitelistVotingStrategy.sierra.json';
import sxPropositionPowerProposalValidationStrategyCasm from './fixtures/sx_PropositionPowerProposalValidationStrategy.casm.json';
import sxPropositionPowerProposalValidationStrategySierra from './fixtures/sx_PropositionPowerProposalValidationStrategy.sierra.json';
import sxSpaceCasm from './fixtures/sx_Space.casm.json';
import sxSpaceSierra from './fixtures/sx_Space.sierra.json';
import sxStarkSigAuthenticatorCasm from './fixtures/sx_StarkSigAuthenticator.casm.json';
import sxStarkSigAuthenticatorSierra from './fixtures/sx_StarkSigAuthenticator.sierra.json';
import sxStarkTxAuthenticatorCasm from './fixtures/sx_StarkTxAuthenticator.casm.json';
import sxStarkTxAuthenticatorSierra from './fixtures/sx_StarkTxAuthenticator.sierra.json';
import sxVanillaAuthenticatorCasm from './fixtures/sx_VanillaAuthenticator.casm.json';
import sxVanillaAuthenticatorSierra from './fixtures/sx_VanillaAuthenticator.sierra.json';
import sxVanillaExecutionStrategyCasm from './fixtures/sx_VanillaExecutionStrategy.casm.json';
import sxVanillaExecutionStrategySierra from './fixtures/sx_VanillaExecutionStrategy.sierra.json';
import sxVanillaProposalValidationStrategyCasm from './fixtures/sx_VanillaProposalValidationStrategy.casm.json';
import sxVanillaProposalValidationStrategySierra from './fixtures/sx_VanillaProposalValidationStrategy.sierra.json';
import sxVanillaVotingStrategyCasm from './fixtures/sx_VanillaVotingStrategy.casm.json';
import sxVanillaVotingStrategySierra from './fixtures/sx_VanillaVotingStrategy.sierra.json';
import { executeContractCallWithSigners } from './safeUtils';
import { StarknetTx } from '../../../src/clients';
import { NetworkConfig } from '../../../src/types';
import { hexPadLeft } from '../../../src/utils/encoding';
import {
  AddressType,
  generateMerkleRoot,
  Leaf
} from '../../../src/utils/merkletree';

export type TestConfig = {
  starknetCore: string;
  owner: string;
  factory: string;
  erc20VotesToken: string;
  spaceAddress: string;
  vanillaAuthenticator: string;
  ethSigAuthenticator: string;
  ethTxAuthenticator: string;
  starkSigAuthenticator: string;
  starkTxAuthenticator: string;
  vanillaExecutionStrategy: string;
  ethRelayerExecutionStrategy: string;
  vanillaProposalValidationStrategy: string;
  propositionPowerProposalValidationStrategy: string;
  vanillaVotingStrategy: string;
  merkleWhitelistVotingStrategy: string;
  erc20VotesVotingStrategy: string;
  merkleWhitelistStrategyMetadata: {
    tree: {
      type: AddressType;
      address: string;
      votingPower: bigint;
    }[];
  };
  l1AvatarExecutionStrategyContract: Contract;
  safeContract: Contract;
  networkConfig: NetworkConfig;
};

export async function deployDependency(
  account: Account,
  sierra: any,
  casm: any,
  args: any[] = []
) {
  const {
    deploy: { contract_address }
  } = await account.declareAndDeploy({
    contract: sierra,
    casm,
    constructorCalldata: args
  });

  return contract_address;
}

async function deployL1Dependency(
  signer: Signer,
  contractDetails: {
    abi: ContractInterface;
    bytecode: string;
  },
  ...args: any[]
) {
  const factory = new ContractFactory(
    contractDetails.abi,
    contractDetails.bytecode,
    signer
  );

  const contract = await factory.deploy(...args);

  return contract.address;
}

export async function setup({
  starknetAccount,
  starknetProvider,
  ethereumWallet,
  ethUrl
}: {
  starknetAccount: Account;
  starknetProvider: RpcProvider;
  ethereumWallet: Wallet;
  ethUrl: string;
}): Promise<TestConfig> {
  await mint(starknetAccount.address, 100000000000000000);

  const masterSpaceResult = await starknetAccount.declareIfNot({
    contract: sxSpaceSierra as any,
    casm: sxSpaceCasm as any
  });

  const factoryResult = await starknetAccount.declareAndDeploy({
    contract: sxFactorySierra as any,
    casm: sxFactoryCasm as any
  });

  const starknetCore = await deployL1Dependency(
    ethereumWallet,
    MockStarknetMessaging,
    5 * 60
  );
  await loadL1MessagingContract(ethUrl, starknetCore);

  const starknetCommit = await deployL1Dependency(
    ethereumWallet,
    StarknetCommit,
    starknetCore
  );

  const masterl1AvatarExecutionStrategy = await deployL1Dependency(
    ethereumWallet,
    L1AvatarExecutionStrategyMockMessagingContract
  );

  const l1AvatarExecutionStrategyFactory = await deployL1Dependency(
    ethereumWallet,
    L1AvatarExecutionStrategyFactoryContract,
    masterl1AvatarExecutionStrategy
  );

  const erc20VotesToken = await deployDependency(
    starknetAccount,
    sxErc20VotesPresetSierra,
    sxErc20VotesPresetCasm,
    CallData.compile({
      name: 'VOTES',
      symbol: 'VOTES',
      supply: uint256.bnToUint256(1000n),
      owner: starknetAccount.address
    })
  );

  await starknetAccount.execute({
    contractAddress: erc20VotesToken,
    entrypoint: 'delegate',
    calldata: CallData.compile({
      delegatee: starknetAccount.address
    })
  });

  const vanillaAuthenticator = await deployDependency(
    starknetAccount,
    sxVanillaAuthenticatorSierra,
    sxVanillaAuthenticatorCasm
  );

  const ethSigAuthenticator = await deployDependency(
    starknetAccount,
    sxEthSigAuthenticatorSierra,
    sxEthSigAuthenticatorCasm
  );

  const ethTxAuthenticator = await deployDependency(
    starknetAccount,
    sxEthTxAuthenticatorSierra,
    sxEthTxAuthenticatorCasm,
    CallData.compile({
      starknet_commit_address: {
        address: starknetCommit
      }
    })
  );

  const starkSigAuthenticator = await deployDependency(
    starknetAccount,
    sxStarkSigAuthenticatorSierra,
    sxStarkSigAuthenticatorCasm,
    CallData.compile({
      name: 'sx-starknet',
      version: '0.1.0'
    })
  );

  const starkTxAuthenticator = await deployDependency(
    starknetAccount,
    sxStarkTxAuthenticatorSierra,
    sxStarkTxAuthenticatorCasm
  );

  const vanillaExecutionStrategy = await deployDependency(
    starknetAccount,
    sxVanillaExecutionStrategySierra,
    sxVanillaExecutionStrategyCasm,
    [1, 0]
  );

  const ethRelayerExecutionStrategy = await deployDependency(
    starknetAccount,
    sxEthRelayerExecutionStrategySierra,
    sxEthRelayerExecutionStrategyCasm
  );

  const vanillaProposalValidationStrategy = await deployDependency(
    starknetAccount,
    sxVanillaProposalValidationStrategySierra,
    sxVanillaProposalValidationStrategyCasm
  );

  const propositionPowerProposalValidationStrategy = await deployDependency(
    starknetAccount,
    sxPropositionPowerProposalValidationStrategySierra,
    sxPropositionPowerProposalValidationStrategyCasm
  );

  const vanillaVotingStrategy = await deployDependency(
    starknetAccount,
    sxVanillaVotingStrategySierra,
    sxVanillaVotingStrategyCasm
  );

  const merkleWhitelistVotingStrategy = await deployDependency(
    starknetAccount,
    sxMerkleWhitelistVotingStrategySierra,
    sxMerkleWhitelistVotingStrategyCasm
  );

  const erc20VotesVotingStrategy = await deployDependency(
    starknetAccount,
    sxErc20VotesVotingStrategySierra,
    sxErc20VotesVotingStrategyCasm
  );

  const masterSpaceClassHash = masterSpaceResult.class_hash;
  const factoryAddress = factoryResult.deploy.contract_address;

  const leaf = new Leaf(
    AddressType.ETHEREUM,
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    42n
  );
  const merkleWhitelistStrategyMetadata = {
    tree: [leaf].map(leaf => ({
      type: leaf.type,
      address: leaf.address,
      votingPower: leaf.votingPower
    }))
  };
  const hashes = [leaf.hash];

  const merkleTreeRoot = generateMerkleRoot(hashes);

  const networkConfig: NetworkConfig = {
    eip712ChainId: '0x534e5f5345504f4c4941',
    spaceFactory: factoryAddress,
    l1AvatarExecutionStrategyImplementation: masterl1AvatarExecutionStrategy,
    l1AvatarExecutionStrategyFactory,
    masterSpace: masterSpaceClassHash as string,
    starknetCommit,
    starknetCore,
    herodotusAccumulatesChainId: 1337,
    authenticators: {
      [hexPadLeft(vanillaAuthenticator)]: {
        type: 'vanilla'
      },
      [hexPadLeft(ethSigAuthenticator)]: {
        type: 'ethSig'
      },
      [hexPadLeft(ethTxAuthenticator)]: {
        type: 'ethTx'
      },
      [hexPadLeft(starkSigAuthenticator)]: {
        type: 'starkSig'
      },
      [hexPadLeft(starkTxAuthenticator)]: {
        type: 'starkTx'
      }
    },
    strategies: {
      [hexPadLeft(vanillaVotingStrategy)]: {
        type: 'vanilla'
      },
      [hexPadLeft(merkleWhitelistVotingStrategy)]: {
        type: 'whitelist'
      },
      [hexPadLeft(erc20VotesVotingStrategy)]: {
        type: 'erc20Votes'
      }
    }
  };

  const client = new StarknetTx({
    starkProvider: starknetProvider,
    ethUrl: 'https://rpc.brovider.xyz/5',
    networkConfig
  });

  const { address } = await client.deploySpace({
    account: starknetAccount,
    params: {
      controller: starknetAccount.address,
      votingDelay: 0,
      minVotingDuration: 0,
      maxVotingDuration: 86400,
      proposalValidationStrategy: {
        addr: propositionPowerProposalValidationStrategy,
        params: CallData.compile({
          threshold: uint256.bnToUint256(1),
          allowed_strategies: [
            {
              address: vanillaVotingStrategy,
              params: ['0x0']
            },
            {
              address: merkleWhitelistVotingStrategy,
              params: [merkleTreeRoot]
            },
            {
              address: erc20VotesVotingStrategy,
              params: [erc20VotesToken]
            }
          ]
        })
      },
      metadataUri: 'ipfs://QmQnbnRF7vsFXYi4ivED2RSmZNC7wi4QKWhFMzSsGjEWp7',
      proposalValidationStrategyMetadataUri:
        'ipfs://QmQnbnRF7vsFXYi4ivED2RSmZNC7wi4QKWhFMzSsGjEWp7',
      daoUri: '',
      authenticators: [
        vanillaAuthenticator,
        ethSigAuthenticator,
        ethTxAuthenticator,
        starkSigAuthenticator,
        starkTxAuthenticator
      ],
      votingStrategies: [
        {
          addr: vanillaVotingStrategy,
          params: ['0x0']
        },
        {
          addr: merkleWhitelistVotingStrategy,
          params: [merkleTreeRoot]
        },
        {
          addr: erc20VotesVotingStrategy,
          params: [erc20VotesToken]
        }
      ],
      votingStrategiesMetadata: ['', '', '']
    }
  });

  const spaceAddress = address;

  const { l1AvatarExecutionStrategyContract, safeContract } =
    await setupL1ExecutionStrategy(ethereumWallet, {
      client,
      spaceAddress,
      ethRelayerAddress: ethRelayerExecutionStrategy,
      quorum: 1n
    });

  return {
    starknetCore,
    owner: starknetAccount.address,
    factory: factoryAddress,
    erc20VotesToken,
    spaceAddress,
    vanillaAuthenticator,
    ethSigAuthenticator,
    ethTxAuthenticator,
    starkSigAuthenticator,
    starkTxAuthenticator,
    vanillaExecutionStrategy,
    ethRelayerExecutionStrategy,
    vanillaProposalValidationStrategy,
    propositionPowerProposalValidationStrategy,
    vanillaVotingStrategy,
    merkleWhitelistVotingStrategy,
    erc20VotesVotingStrategy,
    merkleWhitelistStrategyMetadata,
    l1AvatarExecutionStrategyContract,
    safeContract,
    networkConfig
  };
}

export async function setupL1ExecutionStrategy(
  signer: Wallet,
  {
    client,
    spaceAddress,
    ethRelayerAddress,
    quorum
  }: {
    client: StarknetTx;
    spaceAddress: string;
    ethRelayerAddress: string;
    quorum: bigint;
  }
) {
  const signerAddress = await signer.getAddress();

  const singleton = await deployL1Dependency(signer, GnosisSafeL2Contract);
  const factory = await deployL1Dependency(
    signer,
    GnosisSafeProxyFactoryContract
  );

  const gnosisSafeProxyFactoryContract = new Contract(
    factory,
    GnosisSafeProxyFactoryContract.abi,
    signer
  );

  const template = await gnosisSafeProxyFactoryContract.callStatic.createProxy(
    singleton,
    '0x'
  );
  await gnosisSafeProxyFactoryContract.createProxy(singleton, '0x');

  const safeContract = new Contract(template, GnosisSafeL2Contract.abi, signer);
  await safeContract.setup(
    [signerAddress],
    1,
    '0x0000000000000000000000000000000000000000',
    '0x',
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    0,
    '0x0000000000000000000000000000000000000000'
  );

  const { address } = await client.deployL1AvatarExecution({
    signer,
    params: {
      controller: template,
      target: template,
      executionRelayer: ethRelayerAddress,
      spaces: [spaceAddress],
      quorum
    }
  });

  const l1AvatarExecutionStrategyContract = new Contract(
    address,
    L1AvatarExecutionStrategyMockMessagingContract.abi
  );

  await executeContractCallWithSigners(
    safeContract,
    safeContract,
    'enableModule',
    [address],
    [signer]
  );

  return {
    l1AvatarExecutionStrategyContract,
    safeContract
  };
}

export async function postDevnet(path: string, body: Record<string, any>) {
  const res = await fetch(`http://127.0.0.1:5050/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return res.json();
}

export function mint(address: string, amount: number) {
  return postDevnet('mint', {
    address,
    amount
  });
}

export function setTime(time: number) {
  return postDevnet('set_time', {
    time
  });
}

export function increaseTime(timeIncrease: number) {
  return postDevnet('increase_time', {
    time: timeIncrease
  });
}

export function loadL1MessagingContract(networkUrl: string, address: string) {
  return postDevnet('postman/load_l1_messaging_contract', {
    network_url: networkUrl,
    address
  });
}

export function flush() {
  return postDevnet('postman/flush', {});
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
