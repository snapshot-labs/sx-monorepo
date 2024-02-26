import { uint256, hash, ec } from 'starknet';

export enum AddressType {
  STARKNET,
  ETHEREUM,
  CUSTOM
}

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

    const values = [this.type, this.address, votingPowerUint256.low, votingPowerUint256.high];

    return hash.computeHashOnElements(values);
  }
}

export function generateMerkleRoot(hashes: string[]) {
  if (hashes.length === 1) {
    return hashes[0];
  }

  if (hashes.length % 2 !== 0) {
    hashes = [...hashes, '0x0'];
  }

  const newHashes: string[] = [];

  for (let i = 0; i < hashes.length; i += 2) {
    let left: string;
    let right: string;

    const firstValue = hashes[i];
    const secondValue = hashes[i + 1];

    if (!firstValue || !secondValue) throw new Error('Invalid hash');

    if (BigInt(firstValue) > BigInt(secondValue)) {
      left = firstValue;
      right = secondValue;
    } else {
      left = secondValue;
      right = firstValue;
    }
    newHashes.push(ec.starkCurve.pedersen(left, right));
  }

  return generateMerkleRoot(newHashes);
}

export function generateMerkleProof(hashes: string[], index: number): string[] {
  if (hashes.length === 1) {
    return [];
  }

  if (hashes.length % 2 !== 0) {
    hashes = [...hashes, '0x0'];
  }

  const newHashes: string[] = [];

  for (let i = 0; i < hashes.length; i += 2) {
    let left: string;
    let right: string;

    const firstValue = hashes[i];
    const secondValue = hashes[i + 1];

    if (!firstValue || !secondValue) throw new Error('Invalid hash');

    if (BigInt(firstValue) > BigInt(secondValue)) {
      left = firstValue;
      right = secondValue;
    } else {
      left = secondValue;
      right = firstValue;
    }

    newHashes.push(ec.starkCurve.pedersen(left, right));
  }

  const proof = generateMerkleProof(newHashes, Math.floor(index / 2));

  const prefixIndex = index % 2 === 0 ? index + 1 : index - 1;
  const prefix = hashes[prefixIndex];
  if (!prefix) throw new Error('Invalid hash');

  return [prefix, ...proof];
}
