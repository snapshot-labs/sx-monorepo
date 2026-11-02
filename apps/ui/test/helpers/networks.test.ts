import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

const { getNetworks } = vi.hoisted(() => ({ getNetworks: vi.fn() }));

vi.mock('@/networks', () => ({
  metadataNetwork: 's',
  getNetwork: () => ({ api: { getNetworks } })
}));

async function importGetNetworkDetails() {
  vi.resetModules();
  return (await import('@/helpers/networks')).getNetworkDetails;
}

const flushPromises = () => new Promise(resolve => setTimeout(resolve));

describe('getNetworkDetails()', () => {
  beforeEach(() => {
    getNetworks.mockReset();
  });

  it('should return onchain networks without requesting the hub', async () => {
    const getNetworkDetails = await importGetNetworkDetails();

    expect(getNetworkDetails(1)).toEqual({
      name: 'Ethereum',
      logo: expect.stringMatching(/^ipfs:\/\//),
      explorerUrl: 'https://etherscan.io'
    });
    expect(getNetworkDetails('0x534e5f4d41494e')?.explorerUrl).toBe(
      'https://voyager.online'
    );
    expect(getNetworks).not.toHaveBeenCalled();
  });

  it('should load other networks from the hub once', async () => {
    getNetworks.mockResolvedValue([
      {
        id: '100',
        name: 'Gnosis',
        logo: 'ipfs://logo',
        explorer: 'https://gnosisscan.io',
        spacesCount: 1,
        premium: false
      }
    ]);
    const getNetworkDetails = await importGetNetworkDetails();
    const network = computed(() => getNetworkDetails(100));

    expect(network.value).toBeNull();
    await flushPromises();

    expect(network.value).toEqual({
      name: 'Gnosis',
      logo: 'ipfs://logo',
      explorerUrl: 'https://gnosisscan.io'
    });
    expect(getNetworkDetails(999)).toBeNull();
    expect(getNetworks).toHaveBeenCalledTimes(1);
  });

  it('should request the hub again after a failure', async () => {
    getNetworks.mockRejectedValueOnce(new Error('down')).mockResolvedValue([]);
    const getNetworkDetails = await importGetNetworkDetails();

    getNetworkDetails(100);
    await flushPromises();
    getNetworkDetails(100);

    expect(getNetworks).toHaveBeenCalledTimes(2);
  });
});
