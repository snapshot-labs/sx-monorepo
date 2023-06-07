import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { NonceManager } from '@ethersproject/experimental';

const addressIndicies = {
  // SekhmetDAO
  '0x65e4329e8c0fba31883b98e2cf3e81d3cdcac780': 1
};

export const createWalletProxy = (mnemonic: string, chainId: number) => {
  const signers = new Map<string, NonceManager>();
  const provider = new StaticJsonRpcProvider(`https://rpc.snapshotx.xyz/${chainId}`, chainId);

  return (spaceAddress: string) => {
    const normalizedSpaceAddress = spaceAddress.toLowerCase();

    if (!signers.has(normalizedSpaceAddress)) {
      const index = addressIndicies[normalizedSpaceAddress] || 0;
      const path = `m/44'/60'/0'/0/${index}`;

      const wallet = Wallet.fromMnemonic(mnemonic, path);
      signers.set(normalizedSpaceAddress, new NonceManager(wallet.connect(provider)));
    }

    return signers.get(normalizedSpaceAddress) as NonceManager;
  };
};
