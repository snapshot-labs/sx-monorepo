import { keccak256 } from '@ethersproject/keccak256';
import fetch from 'cross-fetch';

export function getSlotKey(voterAddress: string, slotIndex: number) {
  return keccak256(
    `0x${voterAddress.slice(2).padStart(64, '0')}${slotIndex.toString(16).padStart(64, '0')}`
  );
}

export function getNestedSlotKey(previous: string, index: number) {
  return `0x${(BigInt(keccak256(`${previous}`)) + BigInt(index)).toString(16)}`;
}

export async function getBinaryTree(
  deployedOnChain: string,
  snapshotTimestamp: number,
  chainId: number
) {
  const apiUrl =
    chainId === 1
      ? 'https://rs-indexer.api.herodotus.cloud'
      : 'https://staging.rs-indexer.api.herodotus.cloud';

  const res = await fetch(
    `${apiUrl}/remappers/binsearch-path?timestamp=${snapshotTimestamp}&deployed_on_chain=${deployedOnChain}&accumulates_chain=${chainId}`,
    {
      headers: {
        accept: 'application/json'
      }
    }
  );

  return res.json();
}
