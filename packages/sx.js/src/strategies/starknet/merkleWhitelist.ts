/* eslint-disable @typescript-eslint/no-unused-vars */

import { uint256, validateAndParseAddress } from 'starknet';
import { ClientConfig, Envelope, Propose, Strategy, Vote } from '../../types';
import { AddressType, generateMerkleProof, Leaf } from '../../utils/merkletree';

type Entry = {
  type: AddressType;
  address: string;
  votingPower: bigint;
};

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

      const leaves: Leaf[] = tree.map(
        (entry: Entry) => new Leaf(entry.type, entry.address, entry.votingPower)
      );
      const hashes = leaves.map(leaf => leaf.hash);
      const voterIndex = leaves.findIndex(
        leaf =>
          validateAndParseAddress(leaf.address) ===
          validateAndParseAddress(signerAddress)
      );

      const leaf = leaves[voterIndex];
      if (voterIndex === -1 || !leaf)
        throw new Error('Signer is not in whitelist');

      const votingPowerUint256 = uint256.bnToUint256(leaf.votingPower);

      const proof = generateMerkleProof(hashes, voterIndex);

      return [
        leaf.type.toString(),
        leaf.address,
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
      const tree = metadata?.tree;

      if (!tree) throw new Error('Invalid metadata. Missing tree');

      const leaves: Leaf[] = tree.map(
        (entry: Entry) => new Leaf(entry.type, entry.address, entry.votingPower)
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
