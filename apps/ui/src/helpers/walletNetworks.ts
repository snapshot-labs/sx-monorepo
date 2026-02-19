import { Web3Provider } from '@ethersproject/providers';
import { constants as starknetConstants } from 'starknet';
import { METADATA as EVM_NETWORKS_METADATA } from '@/networks/evm';

const ADDABLE_NETWORKS = {
  //   12345: {
  //     chainName: 'My network name',
  //     nativeCurrency: {
  //       name: 'MyNetwork',
  //       symbol: 'NTW',
  //       decimals: 18
  //     },
  //     rpcUrls: ['https://...'],
  //     blockExplorerUrls: ['https://...']
  //   }
};

export async function verifyNetwork(
  web3Provider: Web3Provider,
  chainId: number
) {
  if (!web3Provider.provider.request) return;

  const network = await web3Provider.getNetwork();
  if (network.chainId === chainId) return;

  const encodedChainId = `0x${chainId.toString(16)}`;

  try {
    await web3Provider.provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: encodedChainId }]
    });
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code !== 4902) {
      throw err;
    }

    if (!(chainId in ADDABLE_NETWORKS)) {
      const networkName = Object.values(EVM_NETWORKS_METADATA).find(
        m => m.chainId === chainId
      )?.name;
      throw new Error(
        `${networkName ?? `Chain with ID ${chainId}`} is not supported by your wallet. Please enable it in your wallet and try again.`
      );
    }

    await web3Provider.provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: encodedChainId,
          chainName: ADDABLE_NETWORKS[chainId].chainName,
          nativeCurrency: ADDABLE_NETWORKS[chainId].nativeCurrency,
          rpcUrls: ADDABLE_NETWORKS[chainId].rpcUrls,
          blockExplorerUrls: ADDABLE_NETWORKS[chainId].blockExplorerUrls
        }
      ]
    });

    const network = await web3Provider.getNetwork();
    if (network.chainId !== chainId) {
      const error = new Error(
        'User rejected network change after it being added'
      );
      (error as any).code = 4001;
      throw error;
    }
  }
}

// Not implemented by Braavos and Argent Mobile
// Signing and verifying messages on different network should work fine
// for single signer message
export async function verifyStarknetNetwork(
  web3: any,
  chainId: starknetConstants.StarknetChainId
) {
  if (!web3.provider.request) return;
  // Skip network switch for Argent Mobile,
  // only SN_MAIN is supported (getting `unknown request` error inside in-built browser)
  if (web3.provider.name === 'Argent Mobile') return;
  try {
    await web3.provider.request({
      type: 'wallet_switchStarknetChain',
      params: {
        chainId
      }
    });
  } catch (e) {
    if (
      e instanceof Error &&
      !e.message.toLowerCase().includes('not implemented')
    ) {
      throw new Error(e.message);
    }
  }
}
