import { describe, expect, it } from 'vitest';
import { formatDelegateRegistryDelegations } from './index';

const API_URL = 'https://delegate-registry-api.snapshot.box';

function strategy(
  name: string,
  network: string,
  params: Record<string, any> = {}
) {
  return { name, network, params };
}

describe('formatDelegateRegistryDelegations', () => {
  it('emits one delegation per distinct network for direct multichain delegation', () => {
    const result = formatDelegateRegistryDelegations(
      {
        id: 'gnosis.eth',
        network: '1',
        strategies: [strategy('delegation', '100'), strategy('delegation', '1')]
      },
      API_URL
    );

    expect(result).toEqual([
      {
        name: 'Delegate registry (Gnosis Chain)',
        apiType: 'delegate-registry',
        apiUrl: API_URL,
        contractAddress: 'gnosis.eth',
        chainId: '100'
      },
      {
        name: 'Delegate registry (Ethereum)',
        apiType: 'delegate-registry',
        apiUrl: API_URL,
        contractAddress: 'gnosis.eth',
        chainId: '1'
      }
    ]);
  });

  it('uses delegationNetwork over the voting network', () => {
    const result = formatDelegateRegistryDelegations(
      {
        id: 'giantkin.eth',
        network: '1',
        strategies: [
          strategy('with-delegation', '1', { delegationNetwork: '42161' })
        ]
      },
      API_URL
    );

    expect(result).toEqual([
      {
        name: 'Delegate registry',
        apiType: 'delegate-registry',
        apiUrl: API_URL,
        contractAddress: 'giantkin.eth',
        chainId: '42161'
      }
    ]);
  });

  it('dedupes repeated strategies sharing one registry', () => {
    const result = formatDelegateRegistryDelegations(
      {
        id: 'stgdao.eth',
        network: '1',
        strategies: [
          strategy('erc20-balance-of-with-delegation', '1', {
            delegationNetwork: '1',
            delegationSpace: 'stgdao.eth'
          }),
          strategy('erc20-balance-of-with-delegation', '56', {
            delegationNetwork: '1',
            delegationSpace: 'stgdao.eth'
          }),
          strategy('erc20-balance-of-with-delegation', '43114', {
            delegationNetwork: '1',
            delegationSpace: 'stgdao.eth'
          })
        ]
      },
      API_URL
    );

    expect(result).toEqual([
      {
        name: 'Delegate registry',
        apiType: 'delegate-registry',
        apiUrl: API_URL,
        contractAddress: 'stgdao.eth',
        chainId: '1'
      }
    ]);
  });

  it('uses delegationSpace over the space id', () => {
    const result = formatDelegateRegistryDelegations(
      {
        id: 'digitech.eth',
        network: '137',
        strategies: [
          strategy('delegation', '137', { delegationSpace: 'apecoin.eth' })
        ]
      },
      API_URL
    );

    expect(result).toEqual([
      {
        name: 'Delegate registry',
        apiType: 'delegate-registry',
        apiUrl: API_URL,
        contractAddress: 'apecoin.eth',
        chainId: '137'
      }
    ]);
  });

  it('ignores non delegate-registry strategies', () => {
    const result = formatDelegateRegistryDelegations(
      {
        id: 'test.eth',
        network: '1',
        strategies: [strategy('erc20-votes', '1', { address: '0x0' })]
      },
      API_URL
    );

    expect(result).toEqual([]);
  });
});
