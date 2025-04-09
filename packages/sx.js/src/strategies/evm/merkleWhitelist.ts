import { AbiCoder } from '@ethersproject/abi';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import {
  ClientConfig,
  Propose,
  Strategy,
  StrategyConfig,
  Vote
} from '../../clients/evm/types';

type Entry = {
  address: string;
  votingPower: string;
};

function getProofForVoter(
  tree: StandardMerkleTree<[string, bigint]>,
  voter: string
) {
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
      metadata: Record<string, any> | null,
      data: Propose | Vote,
      clientConfig: ClientConfig
    ): Promise<string> {
      const tree: Entry[] = metadata?.tree;

      if (!tree) throw new Error('Invalid metadata. Missing tree');

      const voterIndex = tree.findIndex(
        entry => entry.address.toLowerCase() === signerAddress.toLowerCase()
      );

      if (voterIndex === -1) {
        throw new Error('Signer is not in whitelist');
      }

      const whitelist = tree.map(
        entry => [entry.address, BigInt(entry.votingPower)] as [string, bigint]
      );

      let proof: { index: number; proof: string[] } | null = null;
      try {
        const res = await fetch(clientConfig.whitelistServerUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getMerkleProof',
            params: {
              root: strategyConfig.params,
              index: voterIndex
            },
            id: null
          })
        });
        const data = await res.json();
        if (!data.result) throw new Error('Merkle proof not found');

        proof = { index: voterIndex, proof: data.result };
      } catch {
        const merkleTree = StandardMerkleTree.of(whitelist, [
          'address',
          'uint96'
        ]);

        proof = getProofForVoter(merkleTree, signerAddress);
      }

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
      const tree: Entry[] = metadata?.tree;

      if (!tree) throw new Error('Invalid metadata. Missing tree');

      const match = tree.find(
        entry => entry.address.toLowerCase() === voterAddress.toLowerCase()
      );

      if (match) {
        return BigInt(match.votingPower);
      }

      return 0n;
    }
  };
}
