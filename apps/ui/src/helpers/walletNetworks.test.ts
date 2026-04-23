import { describe, expect, it, vi } from 'vitest';
import { verifyNetwork } from './walletNetworks';

vi.mock('@/networks/evm/metadata', () => ({
  METADATA: {
    arb1: { chainId: 42161, name: 'Arbitrum One' }
  }
}));

function makeProvider(
  currentChainId: number,
  requestImpl: (args: { method: string; params?: any[] }) => Promise<any>
) {
  return {
    provider: { request: requestImpl },
    getNetwork: async () => ({ chainId: currentChainId })
  } as any;
}

describe('verifyNetwork', () => {
  it('should do nothing when provider has no request method', async () => {
    const web3Provider = {
      provider: {},
      getNetwork: async () => ({ chainId: 1 })
    } as any;

    await expect(verifyNetwork(web3Provider, 42161)).resolves.toBeUndefined();
  });

  it('should do nothing when already on the correct network', async () => {
    const request = vi.fn();
    const web3Provider = makeProvider(42161, request);

    await expect(verifyNetwork(web3Provider, 42161)).resolves.toBeUndefined();
    expect(request).not.toHaveBeenCalled();
  });

  it('should succeed when wallet_switchEthereumChain succeeds', async () => {
    const request = vi.fn().mockResolvedValue(null);
    const web3Provider = makeProvider(1, request);

    await expect(verifyNetwork(web3Provider, 42161)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xa4b1' }]
    });
  });

  it('should rethrow the original error when it has no code (e.g. guest connector)', async () => {
    const guestError = new Error('Not available when connected as guest');
    const request = vi.fn().mockRejectedValue(guestError);
    const web3Provider = makeProvider(1, request);

    await expect(verifyNetwork(web3Provider, 42161)).rejects.toThrow(
      'Not available when connected as guest'
    );
  });

  it('should rethrow an error with a code other than 4902', async () => {
    const userRejectedError = Object.assign(
      new Error('User rejected the request'),
      { code: 4001 }
    );
    const request = vi.fn().mockRejectedValue(userRejectedError);
    const web3Provider = makeProvider(1, request);

    await expect(verifyNetwork(web3Provider, 42161)).rejects.toThrow(
      'User rejected the request'
    );
  });

  it('should throw a not-supported error when chain is not addable (code 4902)', async () => {
    const chainNotFoundError = Object.assign(
      new Error('Unrecognized chain ID'),
      { code: 4902 }
    );
    const request = vi.fn().mockRejectedValue(chainNotFoundError);
    const web3Provider = makeProvider(1, request);

    await expect(verifyNetwork(web3Provider, 42161)).rejects.toThrow(
      'Arbitrum One is not supported by your wallet. Please enable it in your wallet and try again.'
    );
  });
});
