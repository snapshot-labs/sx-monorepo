import { Contract } from '@ethersproject/contracts';
import { AbiCoder, Interface } from '@ethersproject/abi';
import randomBytes from 'randombytes';
import { getAuthenticator } from '../../../authenticators/evm';
import { getStrategiesParams } from '../../../strategies/evm';
import { evmGoerli } from '../../../networks';
import SpaceAbi from './abis/Space.json';
import ProxyFactoryAbi from './abis/ProxyFactory.json';
import AvatarExecutionStrategyAbi from './abis/AvatarExecutionStrategy.json';
import TimelockExecutionStrategyAbi from './abis/TimelockExecutionStrategy.json';
import type { Signer } from '@ethersproject/abstract-signer';
import type { Propose, UpdateProposal, Vote, Envelope, AddressConfig } from '../types';
import type { EvmNetworkConfig } from '../../../types';

type SpaceParams = {
  controller: string;
  votingDelay: number;
  minVotingDuration: number;
  maxVotingDuration: number;
  proposalValidationStrategy: AddressConfig;
  proposalValidationStrategyMetadataUri: string;
  daoUri: string;
  metadataUri: string;
  authenticators: string[];
  votingStrategies: AddressConfig[];
  votingStrategiesMetadata: string[];
};

type AvatarExecutionStrategyParams = {
  controller: string;
  target: string;
  spaces: string[];
  quorum: bigint;
};

type TimelockExecutionStrategyParams = {
  controller: string;
  vetoGuardian: string;
  spaces: string[];
  timelockDelay: bigint;
  quorum: bigint;
};

type UpdateSettingsInput = {
  minVotingDuration?: number;
  maxVotingDuration?: number;
  votingDelay?: number;
  metadataUri?: string;
  daoUri?: string;
  proposalValidationStrategy?: AddressConfig;
  proposalValidationStrategyMetadataUri?: string;
  authenticatorsToAdd?: string[];
  authenticatorsToRemove?: string[];
  votingStrategiesToAdd?: AddressConfig[];
  votingStrategiesToRemove?: number[];
  votingStrategyMetadataUrisToAdd?: string[];
};

const NO_UPDATE_HASH = '0xf2cda9b13ed04e585461605c0d6e804933ca828111bd94d4e6a96c75e8b048ba';
const NO_UPDATE_ADDRESS = '0xf2cda9b13ed04e585461605c0d6e804933ca8281';
const NO_UPDATE_UINT32 = '0xf2cda9b1';

export class EthereumTx {
  networkConfig: EvmNetworkConfig;

  constructor(opts?: { networkConfig: EvmNetworkConfig }) {
    this.networkConfig = opts?.networkConfig || evmGoerli;
  }

  async deployAvatarExecution({
    signer,
    params: { controller, target, spaces, quorum },
    salt
  }: {
    signer: Signer;
    params: AvatarExecutionStrategyParams;
    salt?: string;
  }): Promise<{ txId: string; address: string }> {
    salt = salt || `0x${randomBytes(32).toString('hex')}`;

    const implementationAddress =
      this.networkConfig.executionStrategiesImplementations['SimpleQuorumAvatar'];

    if (!implementationAddress) {
      throw new Error('Missing SimpleQuorumAvatar implementation address');
    }

    const abiCoder = new AbiCoder();
    const avatarExecutionStrategyInterface = new Interface(AvatarExecutionStrategyAbi);
    const proxyFactoryContract = new Contract(
      this.networkConfig.proxyFactory,
      ProxyFactoryAbi,
      signer
    );

    const initParams = abiCoder.encode(
      ['address', 'address', 'address[]', 'uint256'],
      [controller, target, spaces, quorum]
    );
    const functionData = avatarExecutionStrategyInterface.encodeFunctionData('setUp', [initParams]);

    const address = await proxyFactoryContract.predictProxyAddress(implementationAddress, salt);
    const response = await proxyFactoryContract.deployProxy(
      implementationAddress,
      functionData,
      salt
    );

    return { address, txId: response.hash };
  }

  async deployTimelockExecution({
    signer,
    params: { controller, vetoGuardian, spaces, timelockDelay, quorum },
    salt
  }: {
    signer: Signer;
    params: TimelockExecutionStrategyParams;
    salt?: string;
  }): Promise<{ txId: string; address: string }> {
    salt = salt || `0x${randomBytes(32).toString('hex')}`;

    const implementationAddress =
      this.networkConfig.executionStrategiesImplementations['SimpleQuorumTimelock'];

    if (!implementationAddress) {
      throw new Error('Missing SimpleQuorumTimelock implementation address');
    }

    const abiCoder = new AbiCoder();
    const timelockExecutionStrategyInterface = new Interface(TimelockExecutionStrategyAbi);
    const proxyFactoryContract = new Contract(
      this.networkConfig.proxyFactory,
      ProxyFactoryAbi,
      signer
    );

    const initParams = abiCoder.encode(
      ['address', 'address', 'address[]', 'uint256', 'uint256'],
      [controller, vetoGuardian, spaces, timelockDelay, quorum]
    );
    const functionData = timelockExecutionStrategyInterface.encodeFunctionData('setUp', [
      initParams
    ]);

    const address = await proxyFactoryContract.predictProxyAddress(implementationAddress, salt);
    const response = await proxyFactoryContract.deployProxy(
      implementationAddress,
      functionData,
      salt
    );

    return { address, txId: response.hash };
  }

  async deploySpace({
    signer,
    params: {
      controller,
      votingDelay,
      minVotingDuration,
      maxVotingDuration,
      proposalValidationStrategy,
      proposalValidationStrategyMetadataUri,
      daoUri,
      metadataUri,
      authenticators,
      votingStrategies,
      votingStrategiesMetadata
    },
    salt
  }: {
    signer: Signer;
    params: SpaceParams;
    salt?: string;
  }): Promise<{ txId: string; address: string }> {
    salt = salt || `0x${randomBytes(32).toString('hex')}`;

    const spaceInterface = new Interface(SpaceAbi);
    const proxyFactoryContract = new Contract(
      this.networkConfig.proxyFactory,
      ProxyFactoryAbi,
      signer
    );

    const functionData = spaceInterface.encodeFunctionData('initialize', [
      controller,
      votingDelay,
      minVotingDuration,
      maxVotingDuration,
      proposalValidationStrategy,
      proposalValidationStrategyMetadataUri,
      daoUri,
      metadataUri,
      votingStrategies,
      votingStrategiesMetadata,
      authenticators
    ]);

    const address = await proxyFactoryContract.predictProxyAddress(
      this.networkConfig.masterSpace,
      salt
    );
    const response = await proxyFactoryContract.deployProxy(
      this.networkConfig.masterSpace,
      functionData,
      salt
    );

    return { address, txId: response.hash };
  }

  async predictSpaceAddress({ signer, salt }: { signer: Signer; salt: string }) {
    const proxyFactoryContract = new Contract(
      this.networkConfig.proxyFactory,
      ProxyFactoryAbi,
      signer
    );

    return proxyFactoryContract.predictProxyAddress(this.networkConfig.masterSpace, salt);
  }

  async propose({ signer, envelope }: { signer: Signer; envelope: Envelope<Propose> }) {
    const proposerAddress = envelope.signatureData?.address || (await signer.getAddress());

    const strategiesParams = await getStrategiesParams(
      'propose',
      envelope.data.strategies,
      proposerAddress,
      envelope.data,
      this.networkConfig
    );

    const abiCoder = new AbiCoder();
    const spaceInterface = new Interface(SpaceAbi);
    const functionData = spaceInterface.encodeFunctionData('propose', [
      proposerAddress,
      envelope.data.metadataUri,
      envelope.data.executionStrategy,
      abiCoder.encode(
        ['tuple(int8 index, bytes params)[]'],
        [
          envelope.data.strategies.map((strategyConfig, i) => ({
            index: strategyConfig.index,
            params: strategiesParams[i]
          }))
        ]
      )
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(envelope.data.authenticator, this.networkConfig);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);
    const authenticatorContract = new Contract(envelope.data.authenticator, abi, signer);
    return authenticatorContract.authenticate(...args);
  }

  async updateProposal({
    signer,
    envelope
  }: {
    signer: Signer;
    envelope: Envelope<UpdateProposal>;
  }) {
    const authorAddress = envelope.signatureData?.address || (await signer.getAddress());

    const spaceInterface = new Interface(SpaceAbi);
    const functionData = spaceInterface.encodeFunctionData('updateProposal', [
      authorAddress,
      envelope.data.proposal,
      envelope.data.executionStrategy,
      envelope.data.metadataUri
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(envelope.data.authenticator, this.networkConfig);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);
    const authenticatorContract = new Contract(envelope.data.authenticator, abi, signer);
    return authenticatorContract.authenticate(...args);
  }

  async vote({ signer, envelope }: { signer: Signer; envelope: Envelope<Vote> }) {
    const voterAddress = envelope.signatureData?.address || (await signer.getAddress());

    const strategiesParams = await getStrategiesParams(
      'propose',
      envelope.data.strategies,
      voterAddress,
      envelope.data,
      this.networkConfig
    );

    const spaceInterface = new Interface(SpaceAbi);
    const functionData = spaceInterface.encodeFunctionData('vote', [
      voterAddress,
      envelope.data.proposal,
      envelope.data.choice,
      envelope.data.strategies.map((strategyConfig, i) => ({
        index: strategyConfig.index,
        params: strategiesParams[i]
      })),
      envelope.data.metadataUri
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(envelope.data.authenticator, this.networkConfig);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }
    const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);

    const authenticatorContract = new Contract(envelope.data.authenticator, abi, signer);
    return authenticatorContract.authenticate(...args);
  }

  async execute({
    signer,
    space,
    proposal,
    executionParams
  }: {
    signer: Signer;
    space: string;
    proposal: number;
    executionParams: string;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.execute(proposal, executionParams);
  }

  async executeQueuedProposal({
    signer,
    executionStrategy,
    executionParams
  }: {
    signer: Signer;
    executionStrategy: string;
    executionParams: string;
  }) {
    const executionStrategyContract = new Contract(
      executionStrategy,
      TimelockExecutionStrategyAbi,
      signer
    );

    return executionStrategyContract.executeQueuedProposal(executionParams);
  }

  async cancel({ signer, space, proposal }: { signer: Signer; space: string; proposal: number }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.cancel(proposal);
  }

  async getProposalStatus({
    signer,
    space,
    proposal
  }: {
    signer: Signer;
    space: string;
    proposal: number;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.getProposalStatus(proposal);
  }

  async updateSettings({
    signer,
    space,
    settings
  }: {
    signer: Signer;
    space: string;
    settings: UpdateSettingsInput;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.updateSettings({
      minVotingDuration: settings.minVotingDuration || NO_UPDATE_UINT32,
      maxVotingDuration: settings.maxVotingDuration || NO_UPDATE_UINT32,
      votingDelay: settings.votingDelay || NO_UPDATE_UINT32,
      metadataURI: settings.metadataUri || NO_UPDATE_HASH,
      daoURI: settings.daoUri || NO_UPDATE_HASH,
      proposalValidationStrategy: settings.proposalValidationStrategy || {
        addr: NO_UPDATE_ADDRESS,
        params: '0x00'
      },
      proposalValidationStrategyMetadataURI: settings.proposalValidationStrategyMetadataUri || '',
      authenticatorsToAdd: settings.authenticatorsToAdd || [],
      authenticatorsToRemove: settings.authenticatorsToRemove || [],
      votingStrategiesToAdd: settings.votingStrategiesToAdd || [],
      votingStrategiesToRemove: settings.votingStrategiesToRemove || [],
      votingStrategyMetadataURIsToAdd: settings.votingStrategyMetadataUrisToAdd || []
    });
  }

  async setMaxVotingDuration({
    signer,
    space,
    maxVotingDuration
  }: {
    signer: Signer;
    space: string;
    maxVotingDuration: number;
  }) {
    return this.updateSettings({
      signer,
      space,
      settings: {
        maxVotingDuration
      }
    });
  }

  async setMinVotingDuration({
    signer,
    space,
    minVotingDuration
  }: {
    signer: Signer;
    space: string;
    minVotingDuration: number;
  }) {
    return this.updateSettings({
      signer,
      space,
      settings: {
        minVotingDuration
      }
    });
  }

  async setMetadataUri({
    signer,
    space,
    metadataUri
  }: {
    signer: Signer;
    space: string;
    metadataUri: string;
  }) {
    return this.updateSettings({
      signer,
      space,
      settings: {
        metadataUri
      }
    });
  }

  async setVotingDelay({
    signer,
    space,
    votingDelay
  }: {
    signer: Signer;
    space: string;
    votingDelay: number;
  }) {
    return this.updateSettings({
      signer,
      space,
      settings: {
        votingDelay
      }
    });
  }

  async transferOwnership({
    signer,
    space,
    owner
  }: {
    signer: Signer;
    space: string;
    owner: string;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.transferOwnership(owner);
  }
}
