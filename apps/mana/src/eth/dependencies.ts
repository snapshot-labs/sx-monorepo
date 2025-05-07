import { keccak256 } from '@ethersproject/keccak256';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { NETWORK_IDS } from './rpc';

const WALLET_SECRET = process.env.WALLET_SECRET || '';

export function generateSpaceEVMWallet(
  networkId: string,
  spaceAddress: string
) {
  // Combine the space address and wallet secret to create a unique seed
  const seed = `${networkId}:${spaceAddress}:${WALLET_SECRET}`;
  const privateKey = keccak256(Buffer.from(seed));
  return new Wallet(privateKey);
}

export const createWalletProxy = (chainId: number) => {
  const signers = new Map<string, Wallet>();
  const provider = new StaticJsonRpcProvider(
    `https://rpc.snapshot.org/${chainId}`,
    chainId
  );

  return (spaceAddress: string) => {
    const normalizedSpaceAddress = spaceAddress.toLowerCase();

    if (!signers.has(normalizedSpaceAddress)) {
      const networkId = NETWORK_IDS.get(chainId);
      if (!networkId) throw new Error(`Unsupported chainId ${chainId}`);
      const wallet = generateSpaceEVMWallet(networkId, normalizedSpaceAddress);
      signers.set(normalizedSpaceAddress, wallet.connect(provider));
    }

    return signers.get(normalizedSpaceAddress) as Wallet;
  };
};
