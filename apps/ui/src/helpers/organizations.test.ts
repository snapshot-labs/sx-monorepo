import { describe, expect, it } from 'vitest';
import { getOrgPageLabel } from './organizations';

function org(navItems: any) {
  return { navItems } as any;
}

describe('getOrgPageLabel', () => {
  it('should return undefined when no organization', () => {
    expect(getOrgPageLabel(null, 'proposals', 'eth:0xABC')).toBeUndefined();
  });

  it('should return navItems key name when set', () => {
    expect(
      getOrgPageLabel(
        org({ proposals: { name: 'Votes' } }),
        'proposals',
        'eth:0xABC'
      )
    ).toBe('Votes');
  });

  it('should return undefined when key has no name', () => {
    expect(
      getOrgPageLabel(
        org({ proposals: { icon: {} } }),
        'proposals',
        'eth:0xABC'
      )
    ).toBeUndefined();
  });

  it('should return matched item name when spaceId matches link params', () => {
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

    expect(getOrgPageLabel(org(navItems), 'proposals', 'sn:0xPOLLS')).toBe(
      'Polls'
    );
  });

  it('should fall back to key-level name when spaceId does not match', () => {
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

    expect(getOrgPageLabel(org(navItems), 'proposals', 'eth:0xOTHER')).toBe(
      'Votes'
    );
  });

  it('should not throw on items with string links', () => {
    expect(
      getOrgPageLabel(
        org({ proposals: { name: 'Votes', link: 'https://docs.example.com' } }),
        'proposals',
        'eth:0xABC'
      )
    ).toBe('Votes');
  });

  it('should return undefined when matched item has no name', () => {
    const navItems = {
      unnamed: {
        link: {
          name: 'space-proposals',
          params: { space: 'eth:0xABC' }
        }
      }
    };

    expect(
      getOrgPageLabel(org(navItems), 'proposals', 'eth:0xABC')
    ).toBeUndefined();
  });

  it('should skip items with object link that has no params', () => {
    const navItems = {
      custom: {
        name: 'Custom',
        link: { name: 'space-proposals' }
      }
    };

    expect(
      getOrgPageLabel(org(navItems), 'proposals', 'eth:0xABC')
    ).toBeUndefined();
  });

  it('should skip items with link that targets a different page key', () => {
    const navItems = {
      delegates: {
        name: 'Council',
        link: {
          name: 'space-delegates',
          params: { space: 'eth:0xABC' }
        }
      }
    };

    expect(
      getOrgPageLabel(org(navItems), 'proposals', 'eth:0xABC')
    ).toBeUndefined();
  });
});
