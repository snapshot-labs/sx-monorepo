"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExecutionHash = exports.EIP712_TYPES = void 0;
const hash_1 = require("@ethersproject/hash");
const keccak256_1 = require("@ethersproject/keccak256");
const abi_1 = require("@ethersproject/abi");
exports.EIP712_TYPES = {
    Transaction: [
        {
            name: 'to',
            type: 'address'
        },
        {
            name: 'value',
            type: 'uint256'
        },
        {
            name: 'data',
            type: 'bytes'
        },
        {
            name: 'operation',
            type: 'uint8'
        },
        {
            name: 'nonce',
            type: 'uint256'
        }
    ]
};
/**
 * Computes an execution hash and a set of transaction hashes for a proposal for L1 execution via the Zodiac Module
 * @param verifyingContract The verifying l1 contract
 * @param txs Array of meta transactions
 * @returns An array of transaction hashes and an overall keccak hash of those hashes
 */
function createExecutionHash(txs, verifyingContract, chainId) {
    const domain = {
        chainId: chainId,
        verifyingContract: verifyingContract
    };
    const txHashes = txs.map(tx => hash_1._TypedDataEncoder.hash(domain, exports.EIP712_TYPES, tx));
    const abiCoder = new abi_1.AbiCoder();
    const executionHash = (0, keccak256_1.keccak256)(abiCoder.encode(['bytes32[]'], [txHashes]));
    return {
        executionHash: executionHash,
        txHashes: txHashes
    };
}
exports.createExecutionHash = createExecutionHash;
