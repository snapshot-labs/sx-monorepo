import { keccak256 } from '@ethersproject/keccak256';

export function getSlotKey(voterAddress: string, slotIndex: number) {
  return keccak256(
    `0x${voterAddress.slice(2).padStart(64, '0')}${slotIndex.toString(16).padStart(64, '0')}`
  );
}

export function getNestedSlotKey(previous: string, index: number) {
  return `0x${(BigInt(keccak256(`${previous}`)) + BigInt(index)).toString(16)}`;
}
