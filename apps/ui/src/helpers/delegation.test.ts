import { describe, expect, it } from 'vitest';
import { getDelegateRegistryChainIds } from './delegation';

describe('delegation helpers', () => {
  describe('getDelegateRegistryChainIds', () => {
    it('returns supported direct strategy networks', () => {
      expect(
        getDelegateRegistryChainIds(['with-delegation'], [{ network: 1 }])
      ).toEqual([1]);
    });

    it('returns supported nested strategy networks', () => {
      expect(
        getDelegateRegistryChainIds(
          ['with-delegation'],
          [
            {
              params: {
                strategies: [{ network: 1 }, { params: { network: 42161 } }]
              }
            }
          ]
        )
      ).toEqual([1, 42161]);
    });

    it('converts numeric strings and preserves first-seen order', () => {
      expect(
        getDelegateRegistryChainIds(
          ['with-delegation', 'with-delegation'],
          [{ network: '42161' }, { network: '1' }]
        )
      ).toEqual([42161, 1]);
    });

    it('filters unsupported chains', () => {
      expect(
        getDelegateRegistryChainIds(['with-delegation'], [{ network: 999999 }])
      ).toEqual([]);
    });

    it('removes duplicate chains', () => {
      expect(
        getDelegateRegistryChainIds(
          ['with-delegation'],
          [
            {
              network: 1,
              params: {
                strategies: [
                  { network: '1' },
                  { params: { network: 42161 } },
                  { params: { network: '42161' } }
                ]
              }
            }
          ]
        )
      ).toEqual([1, 42161]);
    });

    it('returns an empty list without Delegate Registry strategies', () => {
      expect(
        getDelegateRegistryChainIds(['erc20-balance-of'], [{ network: 1 }])
      ).toEqual([]);
    });
  });
});
