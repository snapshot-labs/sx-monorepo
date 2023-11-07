"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProofInputs = exports.decodeParams = exports.encodeParams = void 0;
const ints_sequence_1 = require("../ints-sequence");
const bytes_1 = require("../bytes");
/**
 * Single slot proof voting strategy parameter array encoding (Inclusive -> Exclusive):
 *
 * Start Index      End Index                             Name                Description
 * 0             -> 4                                   - slot              - Key of the storage slot containing the balance that will be verified
 * 4             -> 5                                   - num_nodes         - number of nodes in the proof
 * 5             -> 5+num_nodes                         - proof_sizes_bytes - Array of the sizes in bytes of each node proof
 * 5+num_nodes   -> 5+2*num_nodes                       - proof_sizes_words - Array of the number of words in each node proof
 * 5+2*num_nodes -> 5+2*num_nodes+sum(proof_size_words) - proofs_concat     - Array of the node proofs
 *
 * @param slot Key of the slot containing the storage value that will be verified
 * @param proof_sizes_bytes Array of the sizes in bytes of each node proof
 * @param proof_sizes_words Array of the number of words in each node proof
 * @param proofs_concat Array of the node proofs
 * @returns Encoded array
 */
function encodeParams(slot, proofSizesBytes, proofSizesWords, proofsConcat) {
    const numNodes = `0x${proofSizesBytes.length.toString(16)}`;
    return slot.concat([numNodes], proofSizesBytes, proofSizesWords, proofsConcat);
}
exports.encodeParams = encodeParams;
/**
 * Decoding function for the storage proof data
 * @param params Encoded parameter array
 * @returns Decoded parameters
 */
function decodeParams(params) {
    const slot = [params[0], params[1], params[2], params[3]];
    const numNodes = Number(params[4]);
    const proofSizesBytes = params.slice(5, 5 + numNodes);
    const proofSizesWords = params.slice(5 + numNodes, 5 + 2 * numNodes);
    const proofsConcat = params.slice(5 + 2 * numNodes);
    return [slot, proofSizesBytes, proofSizesWords, proofsConcat];
}
exports.decodeParams = decodeParams;
/**
 * Produces the input data for the account and storage proof verification methods in Fossil
 * @param blockNumber Block Number that the proof targets
 * @param proofs Proofs object from RPC call
 * @param accountOptions Config for Fossil to encode which of the values proved by the account proof get stored. Default 15 is all of them.
 * @returns ProofInputs object
 */
function getProofInputs(blockNumber, proofs, accountOptions = 15) {
    const accountProofArray = proofs.accountProof.map((node) => ints_sequence_1.IntsSequence.fromBytes((0, bytes_1.hexToBytes)(node)));
    let accountProof = [];
    let accountProofSizesBytes = [];
    let accountProofSizesWords = [];
    for (const node of accountProofArray) {
        accountProof = accountProof.concat(node.values);
        accountProofSizesBytes = accountProofSizesBytes.concat([`0x${node.bytesLength.toString(16)}`]);
        accountProofSizesWords = accountProofSizesWords.concat([
            `0x${node.values.length.toString(16)}`
        ]);
    }
    const ethAddress = ints_sequence_1.IntsSequence.fromBytes((0, bytes_1.hexToBytes)(proofs.address));
    const ethAddressFelt = proofs.address;
    const storageProofs = [];
    for (let i = 0; i < proofs.storageProof.length; i++) {
        const slot = ints_sequence_1.IntsSequence.fromBytes((0, bytes_1.hexToBytes)(proofs.storageProof[i].key));
        const storageProofArray = proofs.storageProof[i].proof.map((node) => ints_sequence_1.IntsSequence.fromBytes((0, bytes_1.hexToBytes)(node)));
        let storageProof = [];
        let storageProofSizesBytes = [];
        let storageProofSizesWords = [];
        for (const node of storageProofArray) {
            storageProof = storageProof.concat(node.values);
            storageProofSizesBytes = storageProofSizesBytes.concat([
                `0x${node.bytesLength.toString(16)}`
            ]);
            storageProofSizesWords = storageProofSizesWords.concat([
                `0x${node.values.length.toString(16)}`
            ]);
        }
        const storageProofEncoded = encodeParams(slot.values, storageProofSizesBytes, storageProofSizesWords, storageProof);
        storageProofs.push(storageProofEncoded);
    }
    return {
        blockNumber,
        accountOptions,
        ethAddress,
        ethAddressFelt,
        accountProofSizesBytes,
        accountProofSizesWords,
        accountProof,
        storageProofs
    };
}
exports.getProofInputs = getProofInputs;
