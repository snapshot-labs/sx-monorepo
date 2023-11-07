import { Signer } from '@ethersproject/abstract-signer';
import { MetaTransaction } from '../../../utils/encoding';
type DeployParams = {
    owner: string;
    target: string;
    starknetCore: string;
    executionRelayer: string;
    starknetSpaces: string[];
    quorum: bigint;
};
type ExecuteParams = {
    executor: string;
    space: string;
    proposal: {
        startTimestamp: bigint;
        minEndTimestamp: bigint;
        maxEndTimestamp: bigint;
        finalizationStatus: 0 | 1 | 2;
        executionPayloadHash: string;
        executionStrategy: string;
        authorAddressType: 0 | 1 | 2;
        author: string;
        activeVotingStrategies: bigint;
    };
    votesFor: bigint;
    votesAgainst: bigint;
    votesAbstain: bigint;
    executionHash: string;
    transactions: MetaTransaction[];
};
export declare class L1Executor {
    deploy({ signer, params: { owner, target, starknetCore, executionRelayer, starknetSpaces, quorum } }: {
        signer: Signer;
        params: DeployParams;
    }): Promise<{
        address: string;
        txId: string;
    }>;
    execute({ signer, executor, space, proposal, votesFor, votesAgainst, votesAbstain, executionHash, transactions }: {
        signer: Signer;
    } & ExecuteParams): Promise<any>;
}
export {};
