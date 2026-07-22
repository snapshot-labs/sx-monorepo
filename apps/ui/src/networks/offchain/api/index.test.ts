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
  it('emits a single delegation spanning every network for a multichain registry', () => {
    const result = formatDelegateRegistryDelegations(
      {
        id: 'gnosis.eth',
        network: '1',
        strategies: [strategy('delegation', '100'), strategy('delegation', '1')]
      },
      API_URL
    );

    // The delegate-registry API returns the same delegate list for a given
    // registry regardless of chain, so a registry that reads several chains
    // must collapse into ONE tab (chainIds carries the chains to probe for the
    // connected account's own delegation), not one duplicate tab per chain.
    expect(result).toEqual([
      {
        name: 'Delegate registry (Gnosis Chain)',
        apiType: 'delegate-registry',
        apiUrl: API_URL,
        contractAddress: 'gnosis.eth',
        chainId: '100',
        chainIds: ['100', '1']
      }
    ]);
  });

  it('does not duplicate a registry that appears on multiple networks', () => {
    const result = formatDelegateRegistryDelegations(
      {
        id: 'multichain.eth',
        network: '1',
        strategies: [
          strategy('delegation', '1', { delegationSpace: 'shared.eth' }),
          strategy('delegation', '100', { delegationSpace: 'shared.eth' }),
          strategy('delegation', '137', { delegationSpace: 'shared.eth' })
        ]
      },
      API_URL
    );

    expect(result).toHaveLength(1);
    expect(result[0].contractAddress).toBe('shared.eth');
    expect(result[0].chainIds).toEqual(['1', '100', '137']);
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
        chainId: '42161',
        chainIds: ['42161']
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
        chainId: '1',
        chainIds: ['1']
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
        chainId: '137',
        chainIds: ['137']
      }
    ]);
  });

  it('disambiguates two registries that render on the same chain', () => {
    const result = formatDelegateRegistryDelegations(
      {
        id: 'pleasurecoin.eth',
        network: '137',
        strategies: [
          strategy('delegation', '137', {
            delegationSpace: '0x1111111111111111111111111111111111111111'
          }),
          strategy('delegation', '137', {
            delegationSpace: '0x2222222222222222222222222222222222222222'
          })
        ]
      },
      API_URL
    );

    expect(result).toHaveLength(2);
    // Same chain would otherwise produce identical labels; the registry
    // namespace must make them distinguishable.
    const names = result.map(d => d.name);
    expect(new Set(names).size).toBe(2);
    names.forEach(name => expect(name).toContain(' · 0x'));
  });

  it('labels two registries on different chains by chain, without a namespace suffix', () => {
    const result = formatDelegateRegistryDelegations(
      {
        id: 'multiregistry.eth',
        network: '1',
        strategies: [
          strategy('delegation', '1', { delegationSpace: 'one.eth' }),
          strategy('delegation', '137', { delegationSpace: 'two.eth' })
        ]
      },
      API_URL
    );

    expect(result).toHaveLength(2);
    // Distinct chains already disambiguate the tabs, so the registry namespace
    // suffix (` · `) must not be appended.
    const names = result.map(d => d.name);
    names.forEach(name => expect(name).not.toContain(' · '));
    expect(new Set(names).size).toBe(2);
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
