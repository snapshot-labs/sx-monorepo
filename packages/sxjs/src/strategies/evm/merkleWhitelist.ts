import { AbiCoder } from '@ethersproject/abi';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { Strategy, StrategyConfig } from '../../clients/evm/types';

function getProofForVoter(tree: StandardMerkleTree<[string, bigint]>, voter: string) {
  for (const [i, v] of tree.entries()) {
    if ((v[0] as string).toLowerCase() === voter.toLowerCase()) {
      return { index: i, proof: tree.getProof(i) };
    }
  }

  return null;
}

export default function createMerkleWhitelist(): Strategy {
  return {
    type: 'whitelist',
    async getParams(
      call: 'propose' | 'vote',
      strategyConfig: StrategyConfig,
      signerAddress: string,
      metadata: Record<string, any> | null
    ): Promise<string> {
      const tree = metadata?.tree;

      if (!tree) throw new Error('Invalid metadata. Missing tree');

      const whitelist: [string, bigint][] = tree.map(entry => [entry.address, entry.votingPower]);
      const merkleTree = StandardMerkleTree.of(whitelist, ['address', 'uint96']);
      const proof = getProofForVoter(merkleTree, signerAddress);

      if (!proof) throw new Error('Signer is not in whitelist');

      const abiCoder = new AbiCoder();
      return abiCoder.encode(
        ['bytes32[]', 'tuple(address, uint96)'],
        [proof.proof, whitelist[proof.index]]
      );
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null
    ): Promise<bigint> {
      const tree = metadata?.tree;

      if (!tree) throw new Error('Invalid metadata. Missing tree');

      const match = tree.find(entry => entry.address.toLowerCase() === voterAddress.toLowerCase());

      if (match) {
        return BigInt(match.votingPower.toString());
      }

      return 0n;
    }
  };
}
