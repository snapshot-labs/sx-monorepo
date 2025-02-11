import { ec, hash, uint256 } from 'starknet';

export enum AddressType {
  STARKNET,
  ETHEREUM,
  CUSTOM
}

export function throwError(message?: string): never {
  throw new Error(message);
}

const leftChildIndex = (i: number) => 2 * i + 1;
const rightChildIndex = (i: number) => 2 * i + 2;
const parentIndex = (i: number) =>
  i > 0 ? Math.floor((i - 1) / 2) : throwError('Root has no parent');
const siblingIndex = (i: number) =>
  i > 0 ? i - (-1) ** (i % 2) : throwError('Root has no siblings');

export class Leaf {
  public readonly type: AddressType;
  public readonly address: string;
  public readonly votingPower: bigint;

  constructor(type: AddressType, address: string, votingPower: bigint) {
    this.type = type;
    this.address = address;
    this.votingPower = votingPower;
  }

  public get hash(): string {
    const votingPowerUint256 = uint256.bnToUint256(this.votingPower);

    const values = [
      this.type,
      this.address,
      votingPowerUint256.low,
      votingPowerUint256.high
    ];

    return hash.computeHashOnElements(values);
  }
}

export function generateMerkleRoot(hashes: string[]) {
  const tree = generateMerkleTree(hashes);

  return tree[0];
}

export function generateMerkleTree(leaves: string[]) {
  const tree = new Array<string>(2 * leaves.length - 1);

  for (const [i, leaf] of leaves.entries()) {
    tree[tree.length - 1 - i] = leaf;
  }

  for (let i = tree.length - 1 - leaves.length; i >= 0; i--) {
    const leftChild = tree[leftChildIndex(i)]!;
    const rightChild = tree[rightChildIndex(i)]!;

    tree[i] =
      BigInt(leftChild) > BigInt(rightChild)
        ? ec.starkCurve.pedersen(leftChild, rightChild)
        : ec.starkCurve.pedersen(rightChild, leftChild);
  }

  return tree;
}

export function generateMerkleProof(hashes: string[], index: number): string[] {
  const tree = generateMerkleTree(hashes);

  const proof: string[] = [];
  while (index > 0) {
    proof.push(tree[siblingIndex(index)]!);
    index = parentIndex(index);
  }
  return proof;
}
