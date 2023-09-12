import {
  AddressType,
  Leaf,
  generateMerkleProof,
  generateMerkleRoot
} from '../../../src/utils/merkletree';

const TEST_LEAVES = new Array(20).fill(null).map((_, i) => {
  const value = BigInt(i + 1);

  const type = value % 2n === 0n ? AddressType.ETHEREUM : AddressType.STARKNET;
  const address = `0x${value.toString(16)}`;

  return new Leaf(type, address, value);
});

describe('Leaf', () => {
  it('should compute hash', () => {
    const leaf = new Leaf(AddressType.ETHEREUM, '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', 42n);

    expect(leaf.hash).toBe('0x196903245bb2dcafaf9acc391de440ce08a8853b7b1dcbfc670171bb255e119');
  });
});

describe('generateMerkleRoot', () => {
  it('should compute root', () => {
    const hashes = TEST_LEAVES.map(leaf => leaf.hash);
    const root = generateMerkleRoot(hashes);

    expect(root).toBe('0x436373667bef3c745b30e5ae2b485ed5bed08a8c8696f8edeb5cd08ddcc5145');
  });
});

describe('generateMerkleProof', () => {
  it('should compute proof', () => {
    const hashes = TEST_LEAVES.map(leaf => leaf.hash);
    const proof = generateMerkleProof(hashes, 2);

    expect(proof).toEqual([
      '0x58a8aa77c41ec244fe82f53a8e336ee2978e02af49477871f5eb18d6f89ba1f',
      '0x29b078fa0df4bf7784887539cf8afe0cec533cdc6a4bbf33ec3e6ed245c711b',
      '0x688b1e6adba3b93a03f9ce5c9d220aa403a922c72586eff397a34ad664838a5',
      '0x64ce84b224c2acd608f05be345783252bb82c8e7c0e455598b0701b5b79903f',
      '0x2637f8ef64f8b31c1901c56757722fe1dfa15678f5e8df4b7684c966bac16c2'
    ]);
  });
});
