import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { indexWithAddress } from '../utils';
import { NETWORKS } from './rpc';

export const DEFAULT_INDEX = 0;

export function getEthereumWallet(mnemonic: string, index: number) {
  const path = `m/44'/60'/0'/0/${index}`;
  return Wallet.fromMnemonic(mnemonic, path);
}

export const createWalletProxy = (mnemonic: string, chainId: number) => {
  const signers = new Map<string, Wallet>();
  const provider = new StaticJsonRpcProvider(
    `https://rpc.snapshot.org/${chainId}`,
    chainId
  );

  return (spaceAddress: string) => {
    const normalizedSpaceAddress = spaceAddress.toLowerCase();

    if (!signers.has(normalizedSpaceAddress)) {
      const index = indexWithAddress(normalizedSpaceAddress);
      const wallet = getEthereumWallet(mnemonic, index);
      signers.set(normalizedSpaceAddress, wallet.connect(provider));
    }

    return signers.get(normalizedSpaceAddress) as Wallet;
  };
};
