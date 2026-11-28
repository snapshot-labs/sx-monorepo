import { constants } from 'starknet';
import { describe, expect, it, vi } from 'vitest';
import { verifyStarknetNetwork } from '@/helpers/walletNetworks';

const { SN_MAIN, SN_SEPOLIA } = constants.StarknetChainId;
const SWITCH_TO_MAINNET = {
  type: 'wallet_switchStarknetChain',
  params: { chainId: SN_MAIN }
};

function createWeb3(id: string, walletChainId: string) {
  const request = vi.fn(async ({ type }: { type: string }) =>
    type === 'wallet_requestChainId' ? walletChainId : true
  );

  return { web3: { provider: { id, request } }, request };
}

describe('verifyStarknetNetwork', () => {
  it('should not ask Bramble to switch to the network it is on', async () => {
    const { web3, request } = createWeb3('bramble', SN_MAIN);

    await verifyStarknetNetwork(web3, SN_MAIN);

    expect(request.mock.calls).toEqual([[{ type: 'wallet_requestChainId' }]]);
  });

  it('should ask Bramble to switch from another network', async () => {
    const { web3, request } = createWeb3('bramble', SN_SEPOLIA);

    await verifyStarknetNetwork(web3, SN_MAIN);

    expect(request).toHaveBeenLastCalledWith(SWITCH_TO_MAINNET);
  });

  it.each(['SN_MAIN', SN_MAIN.toUpperCase(), ''])(
    'should ask Bramble to switch when it reports its network as %j',
    async walletChainId => {
      const { web3, request } = createWeb3('bramble', walletChainId);

      await verifyStarknetNetwork(web3, SN_MAIN);

      expect(request).toHaveBeenLastCalledWith(SWITCH_TO_MAINNET);
    }
  );

  it('should fail without a switch prompt when Bramble cannot read its network', async () => {
    const request = vi.fn(async () => {
      throw new Error('chain id failed');
    });

    await expect(
      verifyStarknetNetwork({ provider: { id: 'bramble', request } }, SN_MAIN)
    ).rejects.toThrow('chain id failed');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should ask other wallets to switch without reading their network', async () => {
    const { web3, request } = createWeb3('argentX', SN_MAIN);

    await verifyStarknetNetwork(web3, SN_MAIN);

    expect(request.mock.calls).toEqual([[SWITCH_TO_MAINNET]]);
  });
});
