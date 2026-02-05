/* eslint-disable @typescript-eslint/no-unused-vars */

import { uint256, validateAndParseAddress } from 'starknet';
import {
  ClientConfig,
  Envelope,
  Propose,
  Strategy,
  Vote
} from '../../clients/starknet/types';
import {
  AddressType,
  generateMerkleProof,
  generateMerkleTree,
  Leaf
} from '../../utils/merkletree';

type Entry = {
  type: AddressType;
  address: string;
  votingPower: string;
};

export default function createMerkleWhitelistStrategy(): Strategy {
  return {
    type: 'whitelist',
    async getParams(
      call: 'propose' | 'vote',
      signerAddress: string,
      address: string,
      index: number,
      params: string,
      metadata: Record<string, any> | null,
      envelope: Envelope<Propose | Vote>,
      clientConfig: ClientConfig
    ): Promise<string[]> {
      const tree: Entry[] = metadata?.tree;

      if (!tree) throw new Error('Invalid metadata. Missing tree');

      const voterIndex = tree.findIndex(
        entry =>
          validateAndParseAddress(entry.address) ===
          validateAndParseAddress(signerAddress)
      );

      const entry = tree[voterIndex];
      if (voterIndex === -1 || !entry)
        throw new Error('Signer is not in whitelist');

      const votingPowerUint256 = uint256.bnToUint256(entry.votingPower);

      let proof: string[] = [];
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
              root: params,
              index: voterIndex
            },
            id: null
          })
        });

        const data = await res.json();
        if (!data.result) throw new Error('Merkle proof not found');

        proof = data.result;
      } catch {
        const merkleTree = await generateMerkleTree(
          tree.map(entry => `${entry.address}:${entry.votingPower}`)
        );
        proof = generateMerkleProof(merkleTree, voterIndex);
      }

      return [
        entry.type.toString(),
        entry.address,
        votingPowerUint256.low.toString(),
        votingPowerUint256.high.toString(),
        proof.length.toString(),
        ...proof
      ];
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      timestamp: number | null,
      params: string[],
      clientConfig: ClientConfig
    ): Promise<bigint> {
      const tree: Entry[] = metadata?.tree;

      if (!tree) throw new Error('Invalid metadata. Missing tree');

      const leaves: Leaf[] = tree.map(
        entry => new Leaf(entry.type, entry.address, BigInt(entry.votingPower))
      );
      const voter = leaves.find(
        leaf =>
          validateAndParseAddress(leaf.address) ===
          validateAndParseAddress(voterAddress)
      );

      return voter ? voter.votingPower : 0n;
    }
  };
}
