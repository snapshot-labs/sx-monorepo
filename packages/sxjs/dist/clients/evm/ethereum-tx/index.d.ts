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
type CallOptions = {
    noWait?: boolean;
};
export declare class EthereumTx {
    networkConfig: EvmNetworkConfig;
    constructor(opts?: {
        networkConfig: EvmNetworkConfig;
    });
    deployAvatarExecution({ signer, params: { controller, target, spaces, quorum }, saltNonce }: {
        signer: Signer;
        params: AvatarExecutionStrategyParams;
        saltNonce?: string;
    }): Promise<{
        txId: string;
        address: string;
    }>;
    deployTimelockExecution({ signer, params: { controller, vetoGuardian, spaces, timelockDelay, quorum }, saltNonce }: {
        signer: Signer;
        params: TimelockExecutionStrategyParams;
        saltNonce?: string;
    }): Promise<{
        txId: string;
        address: string;
    }>;
    deploySpace({ signer, params: { controller, votingDelay, minVotingDuration, maxVotingDuration, proposalValidationStrategy, proposalValidationStrategyMetadataUri, daoUri, metadataUri, authenticators, votingStrategies, votingStrategiesMetadata }, saltNonce }: {
        signer: Signer;
        params: SpaceParams;
        saltNonce?: string;
    }): Promise<{
        txId: string;
        address: string;
    }>;
    getSalt({ sender, saltNonce }: {
        sender: string;
        saltNonce: string;
    }): Promise<string>;
    predictSpaceAddress({ signer, saltNonce }: {
        signer: Signer;
        saltNonce: string;
    }): Promise<any>;
    propose({ signer, envelope }: {
        signer: Signer;
        envelope: Envelope<Propose>;
    }, opts?: CallOptions): Promise<any>;
    updateProposal({ signer, envelope }: {
        signer: Signer;
        envelope: Envelope<UpdateProposal>;
    }, opts?: CallOptions): Promise<any>;
    vote({ signer, envelope }: {
        signer: Signer;
        envelope: Envelope<Vote>;
    }, opts?: CallOptions): Promise<any>;
    execute({ signer, space, proposal, executionParams }: {
        signer: Signer;
        space: string;
        proposal: number;
        executionParams: string;
    }, opts?: CallOptions): Promise<any>;
    executeQueuedProposal({ signer, executionStrategy, executionParams }: {
        signer: Signer;
        executionStrategy: string;
        executionParams: string;
    }, opts?: CallOptions): Promise<any>;
    vetoExecution({ signer, executionStrategy, executionHash }: {
        signer: Signer;
        executionStrategy: string;
        executionHash: string;
    }, opts?: CallOptions): Promise<any>;
    cancel({ signer, space, proposal }: {
        signer: Signer;
        space: string;
        proposal: number;
    }, opts?: CallOptions): Promise<any>;
    getProposalStatus({ signer, space, proposal }: {
        signer: Signer;
        space: string;
        proposal: number;
    }): Promise<any>;
    updateSettings({ signer, space, settings }: {
        signer: Signer;
        space: string;
        settings: UpdateSettingsInput;
    }, opts?: CallOptions): Promise<any>;
    setMaxVotingDuration({ signer, space, maxVotingDuration }: {
        signer: Signer;
        space: string;
        maxVotingDuration: number;
    }, opts?: CallOptions): Promise<any>;
    setMinVotingDuration({ signer, space, minVotingDuration }: {
        signer: Signer;
        space: string;
        minVotingDuration: number;
    }, opts?: CallOptions): Promise<any>;
    setMetadataUri({ signer, space, metadataUri }: {
        signer: Signer;
        space: string;
        metadataUri: string;
    }, opts?: CallOptions): Promise<any>;
    setVotingDelay({ signer, space, votingDelay }: {
        signer: Signer;
        space: string;
        votingDelay: number;
    }, opts?: CallOptions): Promise<any>;
    transferOwnership({ signer, space, owner }: {
        signer: Signer;
        space: string;
        owner: string;
    }, opts?: CallOptions): Promise<any>;
}
export {};
