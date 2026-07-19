import { AbiCoder, Interface } from '@ethersproject/abi';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { keccak256 } from '@ethersproject/solidity';
import randomBytes from 'randombytes';
import AvatarExecutionStrategyAbi from './abis/AvatarExecutionStrategy.json';
import ProxyFactoryAbi from './abis/ProxyFactory.json';
import SpaceIncoAbi from './abis/Space.inco.json';
import SpaceAbi from './abis/Space.json';
import TimelockExecutionStrategyAbi from './abis/TimelockExecutionStrategy.json';
import { getAuthenticator } from '../../../authenticators/evm';
import { getStrategiesWithParams } from '../../../strategies/evm';
import {
  AddressConfig,
  ClientConfig,
  ClientOpts,
  Envelope,
  Propose,
  UpdateProposal,
  Vote
} from '../types';

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

type CallOptions = {
  noWait?: boolean;
};

const NO_UPDATE_STRING = 'No update';
const NO_UPDATE_ADDRESS = '0xf2cda9b13ed04e585461605c0d6e804933ca8281';
const NO_UPDATE_UINT32 = '0xf2cda9b1';

export class EthereumTx {
  config: ClientConfig;

  constructor(opts: ClientOpts) {
    this.config = opts;
  }

  get defaultTransactionOverrides() {
    return {
      maxPriorityFeePerGas: this.config.networkConfig.maxPriorityFeePerGas
    };
  }

  async deployAvatarExecution({
    signer,
    params: { controller, target, spaces, quorum },
    saltNonce
  }: {
    signer: Signer;
    params: AvatarExecutionStrategyParams;
    saltNonce?: string;
  }): Promise<{ txId: string; address: string }> {
    saltNonce = saltNonce || `0x${randomBytes(32).toString('hex')}`;

    const implementationAddress =
      this.config.networkConfig.executionStrategiesImplementations[
        'SimpleQuorumAvatar'
      ];

    if (!implementationAddress) {
      throw new Error('Missing SimpleQuorumAvatar implementation address');
    }

    const abiCoder = new AbiCoder();
    const avatarExecutionStrategyInterface = new Interface(
      AvatarExecutionStrategyAbi
    );
    const proxyFactoryContract = new Contract(
      this.config.networkConfig.proxyFactory,
      ProxyFactoryAbi,
      signer
    );

    const initParams = abiCoder.encode(
      ['address', 'address', 'address[]', 'uint256'],
      [controller, target, spaces, quorum]
    );
    const functionData = avatarExecutionStrategyInterface.encodeFunctionData(
      'setUp',
      [initParams]
    );

    const sender = await signer.getAddress();
    const salt = await this.getSalt({
      sender,
      saltNonce
    });
    const address = await proxyFactoryContract.predictProxyAddress(
      implementationAddress,
      salt
    );
    const response = await proxyFactoryContract.deployProxy(
      implementationAddress,
      functionData,
      saltNonce,
      this.defaultTransactionOverrides
    );

    return { address, txId: response.hash };
  }

  async deployTimelockExecution({
    signer,
    params: { controller, vetoGuardian, spaces, timelockDelay, quorum },
    saltNonce
  }: {
    signer: Signer;
    params: TimelockExecutionStrategyParams;
    saltNonce?: string;
  }): Promise<{ txId: string; address: string }> {
    saltNonce = saltNonce || `0x${randomBytes(32).toString('hex')}`;

    const implementationAddress =
      this.config.networkConfig.executionStrategiesImplementations[
        'SimpleQuorumTimelock'
      ];

    if (!implementationAddress) {
      throw new Error('Missing SimpleQuorumTimelock implementation address');
    }

    const abiCoder = new AbiCoder();
    const timelockExecutionStrategyInterface = new Interface(
      TimelockExecutionStrategyAbi
    );
    const proxyFactoryContract = new Contract(
      this.config.networkConfig.proxyFactory,
      ProxyFactoryAbi,
      signer
    );

    const initParams = abiCoder.encode(
      ['address', 'address', 'address[]', 'uint256', 'uint256'],
      [controller, vetoGuardian, spaces, timelockDelay, quorum]
    );
    const functionData = timelockExecutionStrategyInterface.encodeFunctionData(
      'setUp',
      [initParams]
    );

    const sender = await signer.getAddress();
    const salt = await this.getSalt({
      sender,
      saltNonce
    });
    const address = await proxyFactoryContract.predictProxyAddress(
      implementationAddress,
      salt
    );
    const response = await proxyFactoryContract.deployProxy(
      implementationAddress,
      functionData,
      saltNonce,
      this.defaultTransactionOverrides
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
    saltNonce
  }: {
    signer: Signer;
    params: SpaceParams;
    saltNonce?: string;
  }): Promise<{ txId: string; address: string }> {
    saltNonce = saltNonce || `0x${randomBytes(32).toString('hex')}`;

    const spaceInterface = new Interface(SpaceAbi);
    const proxyFactoryContract = new Contract(
      this.config.networkConfig.proxyFactory,
      ProxyFactoryAbi,
      signer
    );

    const functionData = spaceInterface.encodeFunctionData('initialize', [
      [
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
      ]
    ]);

    const sender = await signer.getAddress();
    const salt = await this.getSalt({
      sender,
      saltNonce
    });
    const address = await proxyFactoryContract.predictProxyAddress(
      this.config.networkConfig.masterSpace,
      salt
    );
    const response = await proxyFactoryContract.deployProxy(
      this.config.networkConfig.masterSpace,
      functionData,
      saltNonce,
      this.defaultTransactionOverrides
    );

    return { address, txId: response.hash };
  }

  async getSalt({ sender, saltNonce }: { sender: string; saltNonce: string }) {
    return keccak256(['address', 'uint256'], [sender, saltNonce]);
  }

  async predictSpaceAddress({
    signer,
    saltNonce
  }: {
    signer: Signer;
    saltNonce: string;
  }) {
    const proxyFactoryContract = new Contract(
      this.config.networkConfig.proxyFactory,
      ProxyFactoryAbi,
      signer
    );

    const sender = await signer.getAddress();
    const salt = await this.getSalt({
      sender,
      saltNonce
    });

    return proxyFactoryContract.predictProxyAddress(
      this.config.networkConfig.masterSpace,
      salt
    );
  }

  async propose(
    { signer, envelope }: { signer: Signer; envelope: Envelope<Propose> },
    opts: CallOptions = {}
  ) {
    const proposerAddress =
      envelope.signatureData?.address || (await signer.getAddress());

    const userStrategies = await getStrategiesWithParams(
      'propose',
      envelope.data.strategies,
      proposerAddress,
      envelope.data,
      this.config
    );

    const abiCoder = new AbiCoder();
    const spaceInterface = new Interface(SpaceAbi);
    const functionData = spaceInterface.encodeFunctionData('propose', [
      proposerAddress,
      envelope.data.metadataUri,
      envelope.data.executionStrategy,
      abiCoder.encode(['tuple(int8 index, bytes params)[]'], [userStrategies])
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(
      envelope.data.authenticator,
      this.config.networkConfig
    );
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const { abi, args } = authenticator.createCall(envelope, selector, [
      calldata
    ]);
    const authenticatorContract = new Contract(
      envelope.data.authenticator,
      abi,
      signer
    );

    const promise = authenticatorContract.authenticate(
      ...args,
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
  }

  async updateProposal(
    {
      signer,
      envelope
    }: {
      signer: Signer;
      envelope: Envelope<UpdateProposal>;
    },
    opts: CallOptions = {}
  ) {
    const authorAddress =
      envelope.signatureData?.address || (await signer.getAddress());

    const spaceInterface = new Interface(SpaceAbi);
    const functionData = spaceInterface.encodeFunctionData('updateProposal', [
      authorAddress,
      envelope.data.proposal,
      envelope.data.executionStrategy,
      envelope.data.metadataUri
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(
      envelope.data.authenticator,
      this.config.networkConfig
    );
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const { abi, args } = authenticator.createCall(envelope, selector, [
      calldata
    ]);
    const authenticatorContract = new Contract(
      envelope.data.authenticator,
      abi,
      signer
    );
    const promise = authenticatorContract.authenticate(
      ...args,
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
  }

  async vote(
    { signer, envelope }: { signer: Signer; envelope: Envelope<Vote> },
    opts: CallOptions = {}
  ) {
    const voterAddress =
      envelope.signatureData?.address || (await signer.getAddress());

    const userVotingStrategies = await getStrategiesWithParams(
      'vote',
      envelope.data.strategies,
      voterAddress,
      envelope.data,
      this.config
    );

    const isConfidential = !!envelope.data.ciphertext;
    const spaceInterface = new Interface(
      isConfidential ? SpaceIncoAbi : SpaceAbi
    );
    const functionData = spaceInterface.encodeFunctionData('vote', [
      voterAddress,
      envelope.data.proposal,
      isConfidential ? envelope.data.ciphertext : envelope.data.choice,
      userVotingStrategies,
      envelope.data.metadataUri
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(
      envelope.data.authenticator,
      this.config.networkConfig
    );
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }
    const { abi, args } = authenticator.createCall(envelope, selector, [
      calldata
    ]);

    const authenticatorContract = new Contract(
      envelope.data.authenticator,
      abi,
      signer
    );
    // Confidential voter forwards per-vote Inco fee.
    const overrides =
      isConfidential && envelope.data.fee !== undefined
        ? { ...this.defaultTransactionOverrides, value: envelope.data.fee }
        : this.defaultTransactionOverrides;
    const promise = authenticatorContract.authenticate(...args, overrides);

    return opts.noWait ? null : promise;
  }

  async execute(
    {
      signer,
      space,
      proposal,
      executionParams
    }: {
      signer: Signer;
      space: string;
      proposal: number;
      executionParams: string;
    },
    opts: CallOptions = {}
  ) {
    const spaceContract = new Contract(space, SpaceAbi, signer);
    const promise = spaceContract.execute(
      proposal,
      executionParams,
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
  }

  // Reveal step 1: grant caller decrypt access.
  async requestReveal(
    {
      signer,
      space,
      proposal
    }: { signer: Signer; space: string; proposal: number },
    opts: CallOptions = {}
  ) {
    const spaceContract = new Contract(space, SpaceIncoAbi, signer);
    const promise = spaceContract.requestReveal(
      proposal,
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
  }

  // Reveal step 2: submit three attested tallies.
  async finalizeReveal(
    {
      signer,
      space,
      proposal,
      tallies
    }: {
      signer: Signer;
      space: string;
      proposal: number;
      tallies: {
        attestation: { handle: string; value: string };
        signatures: string[];
      }[];
    },
    opts: CallOptions = {}
  ) {
    if (tallies.length !== 3) {
      throw new Error(
        `finalizeReveal expects exactly 3 tallies [against, for, abstain], got ${tallies.length}`
      );
    }
    const spaceContract = new Contract(space, SpaceIncoAbi, signer);
    const promise = spaceContract.finalizeReveal(
      proposal,
      tallies.map(t => ({
        attestation: t.attestation,
        signatures: t.signatures
      })),
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
  }

  // Read three encrypted tally handles [against, for, abstain].
  async getVoteTallyHandles({
    signer,
    space,
    proposal
  }: {
    signer: Signer;
    space: string;
    proposal: number;
  }): Promise<[string, string, string]> {
    const spaceContract = new Contract(space, SpaceIncoAbi, signer);
    const [against, forHandle, abstain] =
      await spaceContract.getVoteTallyHandles(proposal);
    return [against, forHandle, abstain];
  }

  // Fund Space's ETH to pay Inco fees.
  async fundSpace(
    {
      signer,
      space,
      amount
    }: { signer: Signer; space: string; amount: string },
    opts: CallOptions = {}
  ) {
    const spaceContract = new Contract(space, SpaceIncoAbi, signer);
    const promise = spaceContract.fund({
      ...this.defaultTransactionOverrides,
      value: amount
    });

    return opts.noWait ? null : promise;
  }

  async executeQueuedProposal(
    {
      signer,
      executionStrategy,
      executionParams
    }: {
      signer: Signer;
      executionStrategy: string;
      executionParams: string;
    },
    opts: CallOptions = {}
  ) {
    const executionStrategyContract = new Contract(
      executionStrategy,
      TimelockExecutionStrategyAbi,
      signer
    );
    const promise = executionStrategyContract.executeQueuedProposal(
      executionParams,
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
  }

  async vetoExecution(
    {
      signer,
      executionStrategy,
      executionHash
    }: {
      signer: Signer;
      executionStrategy: string;
      executionHash: string;
    },
    opts: CallOptions = {}
  ) {
    const executionStrategyContract = new Contract(
      executionStrategy,
      TimelockExecutionStrategyAbi,
      signer
    );
    const promise = executionStrategyContract.veto(
      executionHash,
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
  }

  async cancel(
    {
      signer,
      space,
      proposal
    }: { signer: Signer; space: string; proposal: number },
    opts: CallOptions = {}
  ) {
    const spaceContract = new Contract(space, SpaceAbi, signer);
    const promise = spaceContract.cancel(
      proposal,
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
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

  async updateSettings(
    {
      signer,
      space,
      settings
    }: {
      signer: Signer;
      space: string;
      settings: UpdateSettingsInput;
    },
    opts: CallOptions = {}
  ) {
    const spaceContract = new Contract(space, SpaceAbi, signer);
    const promise = spaceContract.updateSettings(
      {
        minVotingDuration: settings.minVotingDuration ?? NO_UPDATE_UINT32,
        maxVotingDuration: settings.maxVotingDuration ?? NO_UPDATE_UINT32,
        votingDelay: settings.votingDelay ?? NO_UPDATE_UINT32,
        metadataURI: settings.metadataUri ?? NO_UPDATE_STRING,
        daoURI: settings.daoUri ?? NO_UPDATE_STRING,
        proposalValidationStrategy: settings.proposalValidationStrategy ?? {
          addr: NO_UPDATE_ADDRESS,
          params: '0x00'
        },
        proposalValidationStrategyMetadataURI:
          settings.proposalValidationStrategyMetadataUri ?? '',
        authenticatorsToAdd: settings.authenticatorsToAdd ?? [],
        authenticatorsToRemove: settings.authenticatorsToRemove ?? [],
        votingStrategiesToAdd: settings.votingStrategiesToAdd ?? [],
        votingStrategiesToRemove: settings.votingStrategiesToRemove ?? [],
        votingStrategyMetadataURIsToAdd:
          settings.votingStrategyMetadataUrisToAdd ?? []
      },
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
  }

  async setMaxVotingDuration(
    {
      signer,
      space,
      maxVotingDuration
    }: {
      signer: Signer;
      space: string;
      maxVotingDuration: number;
    },
    opts: CallOptions = {}
  ) {
    return this.updateSettings(
      {
        signer,
        space,
        settings: {
          maxVotingDuration
        }
      },
      opts
    );
  }

  async setMinVotingDuration(
    {
      signer,
      space,
      minVotingDuration
    }: {
      signer: Signer;
      space: string;
      minVotingDuration: number;
    },
    opts: CallOptions = {}
  ) {
    return this.updateSettings(
      {
        signer,
        space,
        settings: {
          minVotingDuration
        }
      },
      opts
    );
  }

  async setMetadataUri(
    {
      signer,
      space,
      metadataUri
    }: {
      signer: Signer;
      space: string;
      metadataUri: string;
    },
    opts: CallOptions = {}
  ) {
    return this.updateSettings(
      {
        signer,
        space,
        settings: {
          metadataUri
        }
      },
      opts
    );
  }

  async setVotingDelay(
    {
      signer,
      space,
      votingDelay
    }: {
      signer: Signer;
      space: string;
      votingDelay: number;
    },
    opts: CallOptions = {}
  ) {
    return this.updateSettings(
      {
        signer,
        space,
        settings: {
          votingDelay
        }
      },
      opts
    );
  }

  async transferOwnership(
    {
      signer,
      space,
      owner
    }: {
      signer: Signer;
      space: string;
      owner: string;
    },
    opts: CallOptions = {}
  ) {
    const spaceContract = new Contract(space, SpaceAbi, signer);
    const promise = spaceContract.transferOwnership(
      owner,
      this.defaultTransactionOverrides
    );

    return opts.noWait ? null : promise;
  }
}
