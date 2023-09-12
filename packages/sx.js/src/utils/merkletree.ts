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
    const votingPoweUint256 = uint256.bnToUint256(this.votingPower);

    const values = [this.type, this.address, votingPoweUint256.low, votingPoweUint256.high];

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
    if (BigInt(hashes[i]) > BigInt(hashes[i + 1])) {
      left = hashes[i];
      right = hashes[i + 1];
    } else {
      left = hashes[i + 1];
      right = hashes[i];
    }

    newHashes.push(ec.starkCurve.pedersen(left, right));
  }

  return generateMerkleRoot(newHashes);
}

export function generateMerkleProof(hashes: string[], index: number) {
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
    if (BigInt(hashes[i]) > BigInt(hashes[i + 1])) {
      left = hashes[i];
      right = hashes[i + 1];
    } else {
      left = hashes[i + 1];
      right = hashes[i];
    }

    newHashes.push(ec.starkCurve.pedersen(left, right));
  }

  const proof = generateMerkleProof(newHashes, Math.floor(index / 2));

  if (index % 2 === 0) {
    return [hashes[index + 1], ...proof];
  } else {
    return [hashes[index - 1], ...proof];
  }
}
