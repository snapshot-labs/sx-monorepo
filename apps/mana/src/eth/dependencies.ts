import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { NonceManager } from '@ethersproject/experimental';

const ethMnemonic = process.env.ETH_MNEMONIC || '';
const ethRpcUrl = process.env.ETH_RPC_URL || '';

const addressIndicies = {
  // SekhmetDAO
  '0x65e4329e8c0fba31883b98e2cf3e81d3cdcac780': 1
};

export const provider = new JsonRpcProvider(ethRpcUrl);

export const createWalletProxy = (mnemonic: string) => {
  const signers = new Map<string, NonceManager>();

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

export const getWallet = createWalletProxy(ethMnemonic);
