import { keccak256 } from '@ethersproject/keccak256';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';

const WALLET_SECRET = process.env.WALLET_SECRET || '';

export function generateSpaceEVMWallet(spaceAddress: string) {
  // Combine the space address and wallet secret to create a unique seed
  const seed = `${spaceAddress}:${WALLET_SECRET}`;
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
      const wallet = generateSpaceEVMWallet(normalizedSpaceAddress);
      signers.set(normalizedSpaceAddress, wallet.connect(provider));
    }

    return signers.get(normalizedSpaceAddress) as Wallet;
  };
};
