import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';

export const DEFAULT_INDEX = 0;
export const SPACES_INDICES = new Map([
  ['0x65e4329e8c0fba31883b98e2cf3e81d3cdcac780', 1], // SekhmetDAO
  ['0x4d95a8be4f1d24d50cc0d7b12f5576fa4bbd892b', 2] // Labs
]);

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
      const index = SPACES_INDICES.get(normalizedSpaceAddress) || DEFAULT_INDEX;
      const wallet = getEthereumWallet(mnemonic, index);
      signers.set(normalizedSpaceAddress, wallet.connect(provider));
    }

    return signers.get(normalizedSpaceAddress) as Wallet;
  };
};
