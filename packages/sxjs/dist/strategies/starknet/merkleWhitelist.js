"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
Object.defineProperty(exports, "__esModule", { value: true });
const starknet_1 = require("starknet");
const merkletree_1 = require("../../utils/merkletree");
function createMerkleWhitelistStrategy() {
    return {
        type: 'whitelist',
        async getParams(call, signerAddress, address, index, metadata, envelope, clientConfig) {
            const tree = metadata?.tree;
            if (!tree)
                throw new Error('Invalid metadata. Missing tree');
            const leaves = tree.map(leaf => new merkletree_1.Leaf(leaf.type, leaf.address, leaf.votingPower));
            const hashes = leaves.map(leaf => leaf.hash);
            const voterIndex = leaves.findIndex(leaf => (0, starknet_1.validateAndParseAddress)(leaf.address) === (0, starknet_1.validateAndParseAddress)(signerAddress));
            if (voterIndex === -1)
                throw new Error('Signer is not in whitelist');
            const votingPowerUint256 = starknet_1.uint256.bnToUint256(leaves[voterIndex].votingPower);
            const proof = (0, merkletree_1.generateMerkleProof)(hashes, voterIndex);
            return [
                leaves[voterIndex].type,
                leaves[voterIndex].address,
                votingPowerUint256.low,
                votingPowerUint256.high,
                proof.length,
                ...proof
            ];
        },
        async getExtraProposeCalls(address, index, envelope, clientConfig) {
            return [];
        },
        async getVotingPower(strategyAddress, voterAddress, metadata, timestamp, params, clientConfig) {
            const tree = metadata?.tree;
            if (!tree)
                throw new Error('Invalid metadata. Missing tree');
            const leaves = tree.map(leaf => new merkletree_1.Leaf(leaf.type, leaf.address, leaf.votingPower));
            const voter = leaves.find(leaf => (0, starknet_1.validateAndParseAddress)(leaf.address) === (0, starknet_1.validateAndParseAddress)(voterAddress));
            return voter ? voter.votingPower : 0n;
        }
    };
}
exports.default = createMerkleWhitelistStrategy;
