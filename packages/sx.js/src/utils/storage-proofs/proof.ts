import { IntsSequence } from '../ints-sequence';
import { hexToBytes } from '../bytes';

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
export function encodeParams(
  slot: string[],
  proofSizesBytes: string[],
  proofSizesWords: string[],
  proofsConcat: string[]
): string[] {
  const numNodes = `0x${proofSizesBytes.length.toString(16)}`;
  return slot.concat([numNodes], proofSizesBytes, proofSizesWords, proofsConcat);
}

/**
 * Decoding function for the storage proof data
 * @param params Encoded parameter array
 * @returns Decoded parameters
 */
export function decodeParams(params: string[]): string[][] {
  const slot: string[] = [params[0], params[1], params[2], params[3]];
  const numNodes = Number(params[4]);
  const proofSizesBytes = params.slice(5, 5 + numNodes);
  const proofSizesWords = params.slice(5 + numNodes, 5 + 2 * numNodes);
  const proofsConcat = params.slice(5 + 2 * numNodes);
  return [slot, proofSizesBytes, proofSizesWords, proofsConcat];
}

export interface ProofInputs {
  blockNumber: number;
  accountOptions: number;
  ethAddress: IntsSequence;
  ethAddressFelt: string; // Fossil treats eth addresses two different ways for some reason, it will be changed soon but now this works
  accountProofSizesBytes: string[];
  accountProofSizesWords: string[];
  accountProof: string[];
  storageProofs: string[][]; // Multiple storage proofs
}

/**
 * Produces the input data for the account and storage proof verification methods in Fossil
 * @param blockNumber Block Number that the proof targets
 * @param proofs Proofs object from RPC call
 * @param accountOptions Config for Fossil to encode which of the values proved by the account proof get stored. Default 15 is all of them.
 * @returns ProofInputs object
 */
export function getProofInputs(blockNumber: number, proofs: any, accountOptions = 15): ProofInputs {
  const accountProofArray = proofs.accountProof.map((node: string) =>
    IntsSequence.fromBytes(hexToBytes(node))
  );
  let accountProof: string[] = [];
  let accountProofSizesBytes: string[] = [];
  let accountProofSizesWords: string[] = [];
  for (const node of accountProofArray) {
    accountProof = accountProof.concat(node.values);
    accountProofSizesBytes = accountProofSizesBytes.concat([`0x${node.bytesLength.toString(16)}`]);
    accountProofSizesWords = accountProofSizesWords.concat([
      `0x${node.values.length.toString(16)}`
    ]);
  }
  const ethAddress = IntsSequence.fromBytes(hexToBytes(proofs.address));
  const ethAddressFelt = proofs.address;

  const storageProofs: string[][] = [];
  for (let i = 0; i < proofs.storageProof.length; i++) {
    const slot = IntsSequence.fromBytes(hexToBytes(proofs.storageProof[i].key));
    const storageProofArray = proofs.storageProof[i].proof.map((node: string) =>
      IntsSequence.fromBytes(hexToBytes(node))
    );
    let storageProof: string[] = [];
    let storageProofSizesBytes: string[] = [];
    let storageProofSizesWords: string[] = [];
    for (const node of storageProofArray) {
      storageProof = storageProof.concat(node.values);
      storageProofSizesBytes = storageProofSizesBytes.concat([
        `0x${node.bytesLength.toString(16)}`
      ]);
      storageProofSizesWords = storageProofSizesWords.concat([
        `0x${node.values.length.toString(16)}`
      ]);
    }
    const storageProofEncoded = encodeParams(
      slot.values,
      storageProofSizesBytes,
      storageProofSizesWords,
      storageProof
    );
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
