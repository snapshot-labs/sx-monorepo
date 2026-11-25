import { constants } from 'starknet';
import { describe, expect, it, vi } from 'vitest';
import { verifyStarknetNetwork } from '@/helpers/walletNetworks';

const { SN_MAIN, SN_SEPOLIA } = constants.StarknetChainId;

function createWallet(currentChainId: string | Error) {
  const request = vi.fn(async ({ type }: { type: string }) => {
    if (type === 'wallet_requestChainId') {
      if (currentChainId instanceof Error) throw currentChainId;
      return currentChainId;
    }
    if (type === 'wallet_switchStarknetChain') return true;
    throw new Error(`unexpected request ${type}`);
  });
  return { web3: { provider: { request } }, request };
}

function requestedTypes(request: ReturnType<typeof vi.fn>) {
  return request.mock.calls.map(([args]) => args.type);
}

describe('verifyStarknetNetwork', () => {
  it('does not ask to switch when the wallet is already on the network', async () => {
    const { web3, request } = createWallet(SN_SEPOLIA);

    await verifyStarknetNetwork(web3, SN_SEPOLIA);

    expect(requestedTypes(request)).toEqual(['wallet_requestChainId']);
  });

  it('matches chain ids regardless of hex formatting', async () => {
    const { web3, request } = createWallet(
      SN_SEPOLIA.toUpperCase().replace('0X', '0x')
    );

    await verifyStarknetNetwork(web3, SN_SEPOLIA);

    expect(requestedTypes(request)).not.toContain('wallet_switchStarknetChain');
  });

  it('asks to switch when the wallet is on another network', async () => {
    const { web3, request } = createWallet(SN_MAIN);

    await verifyStarknetNetwork(web3, SN_SEPOLIA);

    expect(request).toHaveBeenLastCalledWith({
      type: 'wallet_switchStarknetChain',
      params: { chainId: SN_SEPOLIA }
    });
  });

  it('asks to switch when the wallet cannot report its network', async () => {
    const { web3, request } = createWallet(new Error('not implemented'));

    await verifyStarknetNetwork(web3, SN_SEPOLIA);

    expect(requestedTypes(request)).toContain('wallet_switchStarknetChain');
  });
});
