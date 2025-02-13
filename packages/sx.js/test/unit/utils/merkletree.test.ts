import { describe, expect, it } from 'vitest';
import {
  AddressType,
  generateMerkleProof,
  generateMerkleTree,
  Leaf
} from '../../../src/utils/merkletree';

const ENTRIES = new Array(20).fill(null).map((_, i) => {
  const value = BigInt(i + 1);

  const address = `0x${value.toString(16)}`;
  return `${address}:${value}`;
});

describe('Leaf', () => {
  it('should compute hash', () => {
    const leaf = new Leaf(
      AddressType.ETHEREUM,
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      42n
    );

    expect(leaf.hash).toBe(
      '0x196903245bb2dcafaf9acc391de440ce08a8853b7b1dcbfc670171bb255e119'
    );
  });
});

describe('generateMerkleTree', () => {
  it('should compute root', async () => {
    const tree = await generateMerkleTree(ENTRIES);
    const root = tree[0];

    expect(root).toBe(
      '0xbfddde52fc7d24a63693fb4dfa257571238e2d654aecbe6bc26f067e770bc5'
    );
  });
});

describe('generateMerkleProof', () => {
  it('should compute proof', async () => {
    const tree = await generateMerkleTree(ENTRIES);
    const proof = generateMerkleProof(tree, 2);

    expect(proof).toEqual([
      '0x3eca1772359b7a5b248088472ef392716c034e899c510d6e02c0c97704164ab',
      '0x1919a163ca6cb8d28728b24847c269529cf3af4caafb0a2b3e2fd19715f1a8b',
      '0x7a99182fabd949861d469e6e6143187c71ced341c2168de0f62e8e025d76dfc',
      '0x2f0a9bf11b7f4792a3b732f518168d960cfa73d244c020cb88c80293b4fff91',
      '0x2f5a19d2f01021cbd28d1073a68b4123cc56c5811d6da8dea6e0c4c921c0c21'
    ]);
  });
});
