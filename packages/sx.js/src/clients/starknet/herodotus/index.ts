import { Account, CairoOption, CairoOptionVariant, CallData, cairo } from 'starknet';

type ProofElement = {
  index: number;
  value: string;
  proof: string[];
};

export class HerodotusController {
  async cacheTimestamp({
    signer,
    contractAddress,
    timestamp,
    binaryTree
  }: {
    signer: Account;
    contractAddress: string;
    timestamp: number;
    binaryTree: any;
  }) {
    return signer.execute({
      contractAddress,
      entrypoint: 'cache_timestamp',
      calldata: CallData.compile({
        timestamp,
        tree: {
          mapped_id: binaryTree.remapper.onchainRemapperId,
          last_pos: 3,
          peaks: binaryTree.proofs[0].peaksHashes,
          proofs: binaryTree.proofs.map((proof: any) => {
            return {
              index: proof.elementIndex,
              value: cairo.uint256(proof.elementHash),
              proof: proof.siblingsHashes
            };
          }),
          left_neighbor: new CairoOption<ProofElement>(CairoOptionVariant.None)
        }
      })
    });
  }
}
