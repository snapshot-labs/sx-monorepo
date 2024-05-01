import { Account, CairoOption, CairoOptionVariant, CallData, cairo, stark } from 'starknet';
import { ESTIMATE_FEE_OVERHEAD_PERCENT } from '../constants';

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

    const fee = opts?.nonce ? await signer.estimateFee(call) : null;
    const maxFee = fee
      ? stark.estimatedFeeToMaxFee(fee.suggestedMaxFee, ESTIMATE_FEE_OVERHEAD_PERCENT)
      : undefined;
    return signer.execute(call, undefined, fee ? { maxFee } : undefined);
  }
}
