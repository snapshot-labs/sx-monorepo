import { Account, CairoOption, CairoOptionVariant, CallData } from 'starknet';
import { estimateStarknetFee } from '../../../utils/fees';
import StrategyAbi from './abis/Strategy.json';
import { NetworkConfig } from '../../../types';

type ProofElement = {
  index: number;
  value: string;
  proof: string[];
};

type Opts = {
  nonce?: string;
};

const callData = new CallData(StrategyAbi);

export class HerodotusController {
  networkConfig: NetworkConfig;

  constructor(networkConfig: NetworkConfig) {
    this.networkConfig = networkConfig;
  }

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
      calldata: callData.compile('cache_timestamp', {
        timestamp,
        tree: {
          mapper_id: binaryTree.remapper.onchain_remapper_id,
          last_pos: 3,
          peaks: binaryTree.proofs[0].peaks_hashes,
          proofs: binaryTree.proofs.map((proof: any) => {
            return {
              index: proof.element_index,
              value: proof.element_hash,
              proof: proof.siblings_hashes
            };
          }),
          left_neighbor: new CairoOption<ProofElement>(CairoOptionVariant.None)
        }
      })
    };

    const maxFee = opts?.nonce
      ? await estimateStarknetFee(signer, this.networkConfig, call)
      : undefined;
    return signer.execute(call, undefined, { ...opts, maxFee });
  }
}
