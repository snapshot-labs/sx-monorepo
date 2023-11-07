export declare const EIP712_TYPES: {
    Transaction: {
        name: string;
        type: string;
    }[];
};
export interface MetaTransaction {
    to: string;
    value: string | number;
    data: string;
    operation: number;
    salt: bigint;
}
/**
 * Computes an execution hash and a set of transaction hashes for a proposal for L1 execution via the Zodiac Module
 * @param verifyingContract The verifying l1 contract
 * @param txs Array of meta transactions
 * @returns An array of transaction hashes and an overall keccak hash of those hashes
 */
export declare function createExecutionHash(txs: MetaTransaction[], verifyingContract: string, chainId: number): {
    executionHash: string;
    txHashes: string[];
};
