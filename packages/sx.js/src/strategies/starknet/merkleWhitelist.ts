/* eslint-disable @typescript-eslint/no-unused-vars */

import { uint256, validateAndParseAddress } from 'starknet';
import type { ClientConfig, Envelope, Strategy, Propose, Vote } from '../../types';
import { Leaf, generateMerkleProof } from '../../utils/merkletree';

export default function createMerkleWhitelistStrategy(): Strategy {
  return {
    type: 'whitelist',
    async getParams(
      call: 'propose' | 'vote',
      signerAddress: string,
      address: string,
      index: number,
      metadata: Record<string, any> | null,
      envelope: Envelope<Propose | Vote>,
      clientConfig: ClientConfig
    ): Promise<string[]> {
      const tree = metadata?.tree;

      if (!tree) throw new Error('Invalid metadata. Missing tree');

      const leaves: Leaf[] = tree.map(leaf => new Leaf(leaf.type, leaf.address, leaf.votingPower));
      const hashes = leaves.map(leaf => leaf.hash);
      const voterIndex = leaves.findIndex(
        leaf => validateAndParseAddress(leaf.address) === validateAndParseAddress(signerAddress)
      );

      if (voterIndex === -1) throw new Error('Signer is not in whitelist');

      const votingPowerUint256 = uint256.bnToUint256(leaves[voterIndex].votingPower);

      const proof = generateMerkleProof(hashes, voterIndex);

      return [
        leaves[voterIndex].type,
        leaves[voterIndex].address,
        votingPowerUint256.low,
        votingPowerUint256.high,
        proof.length,
        ...proof
      ];
    },
    async getVotingPower(
      spaceAddress: string,
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      timestamp: number | null,
      params: string[],
      clientConfig: ClientConfig
    ): Promise<bigint> {
      const tree = metadata?.tree;

      if (!tree) throw new Error('Invalid metadata. Missing tree');

      const leaves: Leaf[] = tree.map(leaf => new Leaf(leaf.type, leaf.address, leaf.votingPower));
      const voter = leaves.find(
        leaf => validateAndParseAddress(leaf.address) === validateAndParseAddress(voterAddress)
      );

      return voter ? voter.votingPower : 0n;
    }
  };
}
