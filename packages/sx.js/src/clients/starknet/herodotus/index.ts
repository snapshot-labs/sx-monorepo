import { Account, CairoOption, CairoOptionVariant, CallData, cairo } from 'starknet';

type ProofElement = {
  index: number;
  value: string;
  proof: string[];
};

type Opts = {
  nonce?: string;
};

export class HerodotusController {
  async cacheTimestamp(
    {
      signer,
      contractAddress,
      timestamp,
      binaryTree
    }: {
      signer: Account;
      contractAddress: string;
      timestamp: number;
      binaryTree: any;
    },
    opts?: Opts
  ) {
    const call = {
      contractAddress,
      entrypoint: 'cache_timestamp',
      calldata: CallData.compile({
        timestamp,
        tree: {
          mapped_id: binaryTree.remapper.onchain_remapper_id,
          last_pos: 3,
          peaks: binaryTree.proofs[0].peaks_hashes,
          proofs: binaryTree.proofs.map((proof: any) => {
            return {
              index: proof.element_index,
              value: cairo.uint256(proof.element_hash),
              proof: proof.siblings_hashes
            };
          }),
          left_neighbor: new CairoOption<ProofElement>(CairoOptionVariant.None)
        }
      })
    };

    const fee = await signer.estimateFee(call);
    return signer.execute(call, undefined, { ...opts, maxFee: fee.suggestedMaxFee });
  }
}
