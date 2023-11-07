"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const abi_1 = require("@ethersproject/abi");
const merkle_tree_1 = require("@openzeppelin/merkle-tree");
function getProofForVoter(tree, voter) {
    for (const [i, v] of tree.entries()) {
        if (v[0].toLowerCase() === voter.toLowerCase()) {
            return { index: i, proof: tree.getProof(i) };
        }
    }
    return null;
}
function createMerkleWhitelist() {
    return {
        type: 'whitelist',
        async getParams(call, strategyConfig, signerAddress, metadata) {
            const tree = metadata?.tree;
            if (!tree)
                throw new Error('Invalid metadata. Missing tree');
            const whitelist = tree.map(entry => [entry.address, entry.votingPower]);
            const merkleTree = merkle_tree_1.StandardMerkleTree.of(whitelist, ['address', 'uint96']);
            const proof = getProofForVoter(merkleTree, signerAddress);
            if (!proof)
                throw new Error('Signer is not in whitelist');
            const abiCoder = new abi_1.AbiCoder();
            return abiCoder.encode(['bytes32[]', 'tuple(address, uint96)'], [proof.proof, whitelist[proof.index]]);
        },
        async getVotingPower(strategyAddress, voterAddress, metadata) {
            const tree = metadata?.tree;
            if (!tree)
                throw new Error('Invalid metadata. Missing tree');
            const match = tree.find(entry => entry.address.toLowerCase() === voterAddress.toLowerCase());
            if (match) {
                return BigInt(match.votingPower.toString());
            }
            return 0n;
        }
    };
}
exports.default = createMerkleWhitelist;
