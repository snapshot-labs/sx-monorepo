import { Account } from 'starknet';
import { Vote, Propose, Envelope, ClientOpts, ClientConfig, UpdateProposal, AddressConfig } from '../../../types';
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
export declare class StarkNetTx {
    config: ClientConfig;
    constructor(opts: ClientOpts);
    deploySpace({ account, params: { controller, votingDelay, minVotingDuration, maxVotingDuration, metadataUri, daoUri, proposalValidationStrategy, proposalValidationStrategyMetadataUri, authenticators, votingStrategies, votingStrategiesMetadata }, saltNonce }: {
        account: Account;
        params: SpaceParams;
        saltNonce?: string;
    }): Promise<{
        txId: string;
        address: string;
    }>;
    getSalt({ sender, saltNonce }: {
        sender: string;
        saltNonce: string;
    }): Promise<bigint>;
    predictSpaceAddress({ account, saltNonce }: {
        account: Account;
        saltNonce: string;
    }): Promise<string>;
    propose(account: Account, envelope: Envelope<Propose>): Promise<import("starknet").InvokeFunctionResponse>;
    updateProposal(account: Account, envelope: Envelope<UpdateProposal>): Promise<import("starknet").InvokeFunctionResponse>;
    vote(account: Account, envelope: Envelope<Vote>): Promise<import("starknet").InvokeFunctionResponse>;
    execute({ signer, space, proposalId, executionPayload }: {
        signer: Account;
        space: string;
        proposalId: number;
        executionPayload: string[];
    }): Promise<import("starknet").InvokeFunctionResponse>;
    updateSettings({ signer, space, settings }: {
        signer: Account;
        space: string;
        settings: UpdateSettingsInput;
    }): Promise<import("starknet").InvokeFunctionResponse>;
    cancelProposal({ signer, space, proposal }: {
        signer: Account;
        space: string;
        proposal: number;
    }): Promise<import("starknet").InvokeFunctionResponse>;
    setMinVotingDuration({ signer, space, minVotingDuration }: {
        signer: Account;
        space: string;
        minVotingDuration: number;
    }): Promise<import("starknet").InvokeFunctionResponse>;
    setMaxVotingDuration({ signer, space, maxVotingDuration }: {
        signer: Account;
        space: string;
        maxVotingDuration: number;
    }): Promise<import("starknet").InvokeFunctionResponse>;
    setVotingDelay({ signer, space, votingDelay }: {
        signer: Account;
        space: string;
        votingDelay: number;
    }): Promise<import("starknet").InvokeFunctionResponse>;
    setMetadataUri({ signer, space, metadataUri }: {
        signer: Account;
        space: string;
        metadataUri: string;
    }): Promise<import("starknet").InvokeFunctionResponse>;
    transferOwnership({ signer, space, owner }: {
        signer: Account;
        space: string;
        owner: string;
    }): Promise<import("starknet").InvokeFunctionResponse>;
}
export {};
