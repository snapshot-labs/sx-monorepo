// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePageLabels } from './usePageLabels';

const mockOrganization = ref<any>(null);

vi.mock('@/composables/useOrganization', () => ({
  useOrganization: () => ({ organization: mockOrganization })
}));

let testApp: ReturnType<typeof createApp>;

function withSetup<T>(composable: () => T): T {
  let result!: T;
  testApp = createApp({
    setup() {
      result = composable();

      return () => null;
    }
  });
  testApp.mount(document.createElement('div'));

  return result;
}

beforeEach(() => {
  mockOrganization.value = null;
});

afterEach(() => {
  testApp?.unmount();
});

describe('usePageLabels', () => {
  describe('defaults', () => {
    it('should return default label when no organization exists', () => {
      const { getPageLabel } = withSetup(() => usePageLabels());

      expect(getPageLabel('proposals')).toBe('Proposals');
      expect(getPageLabel('overview')).toBe('Overview');
      expect(getPageLabel('delegates')).toBe('Delegates');
      expect(getPageLabel('discussions')).toBe('Discussions');
      expect(getPageLabel('treasury')).toBe('Treasury');
    });
  });

  describe('key-level name override', () => {
    it('should return navItems key name when set', () => {
      mockOrganization.value = {
        navItems: {
          proposals: { name: 'Votes' }
        }
      };
      const { getPageLabel } = withSetup(() => usePageLabels());

      expect(getPageLabel('proposals')).toBe('Votes');
    });

    it('should fall back to default when key has no name', () => {
      mockOrganization.value = {
        navItems: {
          proposals: { icon: {} }
        }
      };
      const { getPageLabel } = withSetup(() => usePageLabels());

      expect(getPageLabel('proposals')).toBe('Proposals');
    });
  });

  describe('space-specific match', () => {
    const navItems = {
      proposals: { name: 'Votes' },
      polls: {
        name: 'Polls',
        link: {
          name: 'space-proposals',
          params: { space: 'sn:0xPOLLS' }
        }
      }
    };

    it('should return matched item name when spaceId matches link params', () => {
      mockOrganization.value = { navItems };
      const { getPageLabel } = withSetup(() => usePageLabels());

      expect(getPageLabel('proposals', 'sn:0xPOLLS')).toBe('Polls');
    });

    it('should fall back to key-level name when spaceId does not match', () => {
      mockOrganization.value = { navItems };
      const { getPageLabel } = withSetup(() => usePageLabels());

      expect(getPageLabel('proposals', 'eth:0xOTHER')).toBe('Votes');
    });

    it('should not throw on items with string links', () => {
      mockOrganization.value = {
        navItems: {
          proposals: {
            name: 'Votes',
            link: 'https://docs.example.com'
          }
        }
      };
      const { getPageLabel } = withSetup(() => usePageLabels());

      expect(getPageLabel('proposals', 'eth:0xABC')).toBe('Votes');
    });

    it('should fall back when matched item has no name', () => {
      mockOrganization.value = {
        navItems: {
          unnamed: {
            link: {
              name: 'space-proposals',
              params: { space: 'eth:0xABC' }
            }
          }
        }
      };
      const { getPageLabel } = withSetup(() => usePageLabels());

      expect(getPageLabel('proposals', 'eth:0xABC')).toBe('Proposals');
    });

    it('should skip items with object link that has no params', () => {
      mockOrganization.value = {
        navItems: {
          custom: {
            name: 'Custom',
            link: { name: 'space-proposals' }
          }
        }
      };
      const { getPageLabel } = withSetup(() => usePageLabels());

      expect(getPageLabel('proposals', 'eth:0xABC')).toBe('Proposals');
    });

    it('should skip items with link that targets a different page key', () => {
      mockOrganization.value = {
        navItems: {
          delegates: {
            name: 'Council',
            link: {
              name: 'space-delegates',
              params: { space: 'eth:0xABC' }
            }
          }
        }
      };
      const { getPageLabel } = withSetup(() => usePageLabels());

      expect(getPageLabel('proposals', 'eth:0xABC')).toBe('Proposals');
    });
  });

  describe('default spaceId from space ref', () => {
    it('should use space ref to derive default spaceId', () => {
      mockOrganization.value = {
        navItems: {
          proposals: { name: 'Votes' },
          polls: {
            name: 'Polls',
            link: {
              name: 'space-proposals',
              params: { space: 'eth:0xSPACE' }
            }
          }
        }
      };
      const space = { network: 'eth', id: '0xSPACE' } as any;
      const { getPageLabel } = withSetup(() => usePageLabels(() => space));

      expect(getPageLabel('proposals')).toBe('Polls');
    });

    it('should prefer explicit spaceId over default', () => {
      mockOrganization.value = {
        navItems: {
          proposals: { name: 'Votes' },
          polls: {
            name: 'Polls',
            link: {
              name: 'space-proposals',
              params: { space: 'eth:0xSPACE' }
            }
          }
        }
      };
      const space = { network: 'eth', id: '0xSPACE' } as any;
      const { getPageLabel } = withSetup(() => usePageLabels(() => space));

      expect(getPageLabel('proposals', 'eth:0xOTHER')).toBe('Votes');
    });
  });
});
