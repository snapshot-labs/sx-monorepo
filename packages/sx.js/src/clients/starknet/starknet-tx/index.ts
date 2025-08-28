import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { TransactionResponse } from '@ethersproject/providers';
import { poseidonHashMany } from 'micro-starknet';
import randomBytes from 'randombytes';
import { Account, CallData, hash, shortString, uint256 } from 'starknet';
import SpaceAbi from './abis/Space.json';
import { getAuthenticator } from '../../../authenticators/starknet';
import { predictCloneAddress } from '../../../utils/address';
import { hexPadLeft } from '../../../utils/encoding';
import { estimateStarknetFee } from '../../../utils/fees';
import { getStrategiesWithParams } from '../../../utils/strategies';
import L1AvatarExecutionStrategyFactoryAbi from '../l1-executor/abis/L1AvatarExecutionStrategyFactory.json';
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
  metadataUri: string;
  daoUri: string;
  authenticators: string[];
  votingStrategies: AddressConfig[];
  votingStrategiesMetadata: string[];
};

type L1AvatarExecutionStrategyParams = {
  controller: string;
  target: string;
  executionRelayer: string;
  spaces: string[];
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

type Opts = {
  nonce?: string;
};

const NO_UPDATE_U32 = '0xf2cda9b1';
const NO_UPDATE_ADDRESS =
  '0xf2cda9b13ed04e585461605c0d6e804933ca828111bd94d4e6a96c75e8b048';
const NO_UPDATE_STRING = 'No update';

const callData = new CallData(SpaceAbi);

export class StarknetTx {
  config: ClientConfig;

  constructor(opts: ClientOpts) {
    this.config = opts;
  }

  async deploySpace({
    account,
    params: {
      controller,
      votingDelay,
      minVotingDuration,
      maxVotingDuration,
      metadataUri,
      daoUri,
      proposalValidationStrategy,
      proposalValidationStrategyMetadataUri,
      authenticators,
      votingStrategies,
      votingStrategiesMetadata
    },
    saltNonce
  }: {
    account: Account;
    params: SpaceParams;
    saltNonce?: string;
  }): Promise<{ txId: string; address: string }> {
    saltNonce = saltNonce || `0x${randomBytes(30).toString('hex')}`;
    const address = await this.predictSpaceAddress({ account, saltNonce });

    const res = await account.execute({
      contractAddress: this.config.networkConfig.spaceFactory,
      entrypoint: 'deploy',
      calldata: CallData.compile({
        class_hash: this.config.networkConfig.masterSpace,
        initialize_calldata: callData.compile('initialize', [
          controller,
          minVotingDuration,
          maxVotingDuration,
          votingDelay,
          {
            address: proposalValidationStrategy.addr,
            params: proposalValidationStrategy.params
          },
          shortString.splitLongString(proposalValidationStrategyMetadataUri),
          votingStrategies.map(strategy => ({
            address: strategy.addr,
            params: strategy.params
          })),
          votingStrategiesMetadata.map(metadata =>
            shortString.splitLongString(metadata)
          ),
          authenticators,
          shortString.splitLongString(metadataUri),
          shortString.splitLongString(daoUri)
        ]),
        salt_nonce: saltNonce
      })
    });

    return { txId: res.transaction_hash, address };
  }

  async deployL1AvatarExecution({
    signer,
    params: { controller, target, executionRelayer, spaces, quorum },
    salt
  }: {
    signer: Signer;
    params: L1AvatarExecutionStrategyParams;
    salt?: string;
  }): Promise<{ txId: string; address: string }> {
    const usedSalt = salt || `0x${randomBytes(32).toString('hex')}`;

    const address = predictCloneAddress(
      this.config.networkConfig.l1AvatarExecutionStrategyImplementation,
      this.config.networkConfig.l1AvatarExecutionStrategyFactory,
      usedSalt
    );

    const l1AvatarExecutionStrategyFactory = new Contract(
      this.config.networkConfig.l1AvatarExecutionStrategyFactory,
      L1AvatarExecutionStrategyFactoryAbi,
      signer
    );

    const response: TransactionResponse =
      await l1AvatarExecutionStrategyFactory.createContract(
        controller,
        target,
        this.config.networkConfig.starknetCore,
        executionRelayer,
        spaces,
        quorum,
        usedSalt
      );

    return { address, txId: response.hash };
  }

  async getSalt({ sender, saltNonce }: { sender: string; saltNonce: string }) {
    return poseidonHashMany([BigInt(sender), BigInt(saltNonce)]);
  }

  async predictSpaceAddress({
    account,
    saltNonce
  }: {
    account: Account;
    saltNonce: string;
  }) {
    const salt = await this.getSalt({ sender: account.address, saltNonce });

    return hexPadLeft(
      hash.calculateContractAddressFromHash(
        salt,
        this.config.networkConfig.masterSpace,
        CallData.compile([]),
        this.config.networkConfig.spaceFactory
      )
    );
  }

  async propose(account: Account, envelope: Envelope<Propose>, opts?: Opts) {
    const authorAddress = envelope.signatureData?.address || account.address;

    const authenticator = getAuthenticator(
      envelope.data.authenticator,
      this.config.networkConfig
    );
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const userStrategies = await getStrategiesWithParams(
      'propose',
      envelope.data.strategies,
      authorAddress,
      envelope.data,
      this.config
    );

    const call = authenticator.createProposeCall(envelope, {
      author: authorAddress,
      executionStrategy: {
        address: envelope.data.executionStrategy.addr,
        params: envelope.data.executionStrategy.params
      },
      strategiesParams: CallData.compile({
        userStrategies
      }),
      metadataUri: envelope.data.metadataUri
    });

    const calls = [call];

    const maxFee = opts?.nonce
      ? await estimateStarknetFee(account, this.config.networkConfig, calls)
      : undefined;
    return account.execute(calls, { ...opts, maxFee });
  }

  async updateProposal(
    account: Account,
    envelope: Envelope<UpdateProposal>,
    opts?: Opts
  ) {
    const authorAddress = envelope.signatureData?.address || account.address;

    const authenticator = getAuthenticator(
      envelope.data.authenticator,
      this.config.networkConfig
    );
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const call = authenticator.createUpdateProposalCall(envelope, {
      author: authorAddress,
      proposalId: envelope.data.proposal,
      executionStrategy: {
        address: envelope.data.executionStrategy.addr,
        params: envelope.data.executionStrategy.params
      },
      metadataUri: envelope.data.metadataUri
    });

    const maxFee = opts?.nonce
      ? await estimateStarknetFee(account, this.config.networkConfig, call)
      : undefined;
    return account.execute(call, { ...opts, maxFee });
  }

  async vote(account: Account, envelope: Envelope<Vote>, opts?: Opts) {
    const voterAddress = envelope.signatureData?.address || account.address;

    const authenticator = getAuthenticator(
      envelope.data.authenticator,
      this.config.networkConfig
    );
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const votingStrategies = await getStrategiesWithParams(
      'vote',
      envelope.data.strategies,
      voterAddress,
      envelope.data,
      this.config
    );

    const call = authenticator.createVoteCall(envelope, {
      voter: voterAddress,
      proposalId: envelope.data.proposal,
      choice: envelope.data.choice,
      votingStrategies,
      metadataUri: envelope.data.metadataUri
    });

    const maxFee = opts?.nonce
      ? await estimateStarknetFee(account, this.config.networkConfig, call)
      : undefined;
    return account.execute(call, { ...opts, maxFee });
  }

  async execute(
    {
      signer,
      space,
      proposalId,
      executionPayload
    }: {
      signer: Account;
      space: string;
      proposalId: number;
      executionPayload: string[];
    },
    opts?: Opts
  ) {
    const call = {
      contractAddress: space,
      entrypoint: 'execute',
      calldata: callData.compile('execute', [
        uint256.bnToUint256(proposalId),
        executionPayload
      ])
    };

    const maxFee = opts?.nonce
      ? await estimateStarknetFee(signer, this.config.networkConfig, call)
      : undefined;
    return signer.execute(call, { ...opts, maxFee });
  }

  async updateSettings({
    signer,
    space,
    settings
  }: {
    signer: Account;
    space: string;
    settings: UpdateSettingsInput;
  }) {
    const settingsData = [
      {
        min_voting_duration: settings.minVotingDuration ?? NO_UPDATE_U32,
        max_voting_duration: settings.maxVotingDuration ?? NO_UPDATE_U32,
        voting_delay: settings.votingDelay ?? NO_UPDATE_U32,
        metadata_uri: shortString.splitLongString(
          settings.metadataUri ?? NO_UPDATE_STRING
        ),
        dao_uri: shortString.splitLongString(
          settings.daoUri ?? NO_UPDATE_STRING
        ),
        proposal_validation_strategy: settings.proposalValidationStrategy
          ? {
              address: settings.proposalValidationStrategy.addr,
              params: settings.proposalValidationStrategy.params
            }
          : {
              address: NO_UPDATE_ADDRESS,
              params: []
            },
        proposal_validation_strategy_metadata_uri: shortString.splitLongString(
          settings.proposalValidationStrategyMetadataUri ?? NO_UPDATE_STRING
        ),
        authenticators_to_add: settings.authenticatorsToAdd ?? [],
        authenticators_to_remove: settings.authenticatorsToRemove ?? [],
        voting_strategies_to_add:
          settings.votingStrategiesToAdd?.map(config => ({
            address: config.addr,
            params: config.params
          })) ?? [],
        voting_strategies_to_remove: settings.votingStrategiesToRemove ?? [],
        voting_strategies_metadata_uris_to_add:
          (settings.votingStrategyMetadataUrisToAdd &&
            settings.votingStrategyMetadataUrisToAdd.map(str =>
              shortString.splitLongString(str)
            )) ??
          []
      }
    ];

    return signer.execute({
      contractAddress: space,
      entrypoint: 'update_settings',
      calldata: callData.compile('update_settings', settingsData)
    });
  }

  async cancelProposal({
    signer,
    space,
    proposal
  }: {
    signer: Account;
    space: string;
    proposal: number;
  }) {
    return signer.execute({
      contractAddress: space,
      entrypoint: 'cancel',
      calldata: callData.compile('cancel', [uint256.bnToUint256(proposal)])
    });
  }

  async setMinVotingDuration({
    signer,
    space,
    minVotingDuration
  }: {
    signer: Account;
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

  async setMaxVotingDuration({
    signer,
    space,
    maxVotingDuration
  }: {
    signer: Account;
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

  async setVotingDelay({
    signer,
    space,
    votingDelay
  }: {
    signer: Account;
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

  async setMetadataUri({
    signer,
    space,
    metadataUri
  }: {
    signer: Account;
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

  async transferOwnership({
    signer,
    space,
    owner
  }: {
    signer: Account;
    space: string;
    owner: string;
  }) {
    return signer.execute({
      contractAddress: space,
      entrypoint: 'transfer_ownership',
      calldata: callData.compile('transfer_ownership', [owner])
    });
  }
}
