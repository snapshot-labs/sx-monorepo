import { IntsSequence } from '../ints-sequence';
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
export declare function encodeParams(slot: string[], proofSizesBytes: string[], proofSizesWords: string[], proofsConcat: string[]): string[];
/**
 * Decoding function for the storage proof data
 * @param params Encoded parameter array
 * @returns Decoded parameters
 */
export declare function decodeParams(params: string[]): string[][];
export interface ProofInputs {
    blockNumber: number;
    accountOptions: number;
    ethAddress: IntsSequence;
    ethAddressFelt: string;
    accountProofSizesBytes: string[];
    accountProofSizesWords: string[];
    accountProof: string[];
    storageProofs: string[][];
}
/**
 * Produces the input data for the account and storage proof verification methods in Fossil
 * @param blockNumber Block Number that the proof targets
 * @param proofs Proofs object from RPC call
 * @param accountOptions Config for Fossil to encode which of the values proved by the account proof get stored. Default 15 is all of them.
 * @returns ProofInputs object
 */
export declare function getProofInputs(blockNumber: number, proofs: any, accountOptions?: number): ProofInputs;
