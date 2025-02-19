import { ec, hash, uint256 } from 'starknet';

export enum AddressType {
  STARKNET,
  ETHEREUM,
  CUSTOM
}

function throwError(message?: string): never {
  throw new Error(message);
}

const scheduleImmediate = () =>
  new Promise(resolve => {
    if (typeof setImmediate === 'function') {
      setImmediate(() => resolve(true));
    } else if (typeof window === 'object' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => resolve(true));
    } else {
      setTimeout(() => resolve(true), 0);
    }
  });

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

/**
 * Computes merkle tree in async mode. This uses setImmediate to yield to the event loop.
 * This is useful for large trees to avoid blocking the event loop.
 * There is still a blocking part in the computation of hashes (element hashes and node hashes).
 * @param entries Array of whitelist entries in format of "address:votingPower"
 */
export async function generateMerkleTree(entries: string[]) {
  const leaves = entries.map(entry => {
    const [address, votingPower] = entry.split(':').map(s => s.trim());
    if (!address || !votingPower) throwError('Invalid entry format');
    const type =
      address.length === 42 ? AddressType.ETHEREUM : AddressType.STARKNET;

    return new Leaf(type, address, BigInt(votingPower));
  });

  const hashes: string[] = [];

  for (const leaf of leaves) {
    hashes.push(leaf.hash);
    await scheduleImmediate();
  }

  const tree = new Array<string>(2 * hashes.length - 1);

  for (const [i, hash] of hashes.entries()) {
    tree[tree.length - 1 - i] = hash;
  }

  for (let i = tree.length - 1 - hashes.length; i >= 0; i--) {
    const leftChild = tree[leftChildIndex(i)]!;
    const rightChild = tree[rightChildIndex(i)]!;

    tree[i] =
      BigInt(leftChild) > BigInt(rightChild)
        ? ec.starkCurve.pedersen(leftChild, rightChild)
        : ec.starkCurve.pedersen(rightChild, leftChild);

    await scheduleImmediate();
  }

  return tree;
}

function getProof(tree: string[], index: number): string[] {
  const proof: string[] = [];
  while (index > 0) {
    proof.push(tree[siblingIndex(index)]!);
    index = parentIndex(index);
  }
  return proof;
}

export function generateMerkleProof(tree: string[], index: number): string[] {
  return getProof(tree, tree.length - 1 - index);
}
