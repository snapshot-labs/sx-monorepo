import { keccak256 } from '@ethersproject/keccak256';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import fetch from 'cross-fetch';

export function getEthRpcUrl(chainId: number) {
  const apiKey = '46a5dd9727bf48d4a132672d3f376146';

  // TODO: ideally we would use rpc.snapshotx.xyz here but those don't support eth_getProof with past lookup
  if (chainId === 1) return `https://mainnet.infura.io/v3/${apiKey}`;
  if (chainId === 5) return `https://goerli.infura.io/v3/${apiKey}`;
  if (chainId === 11155111) return `https://sepolia.infura.io/v3/${apiKey}`;
  if (chainId === 137) return `https://polygon-mainnet.infura.io/v3/${apiKey}`;
  if (chainId === 42161) return `https://arbitrum-mainnet.infura.io/v3/${apiKey}`;

  throw new Error(`Unsupported chainId ${chainId}`);
}

export function getEthProvider(chainId: number) {
  return new StaticJsonRpcProvider(getEthRpcUrl(chainId), chainId);
}

export function getSlotKey(voterAddress: string, slotIndex: number) {
  return keccak256(
    `0x${voterAddress.slice(2).padStart(64, '0')}${slotIndex.toString(16).padStart(64, '0')}`
  );
}

export async function getBinaryTree(
  deployedOnChain: string,
  snapshotTimestamp: number,
  chainId: number
) {
  const res = await fetch(
    `https://ds-indexer.api.herodotus.cloud/binsearch-path?timestamp=${snapshotTimestamp}&deployed_on_chain=${deployedOnChain}&accumulates_chain=${chainId}`,
    {
      headers: {
        accept: 'application/json'
      }
    }
  );

  return res.json();
}
