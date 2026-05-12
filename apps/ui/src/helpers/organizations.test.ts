import { describe, expect, it } from 'vitest';
import {
  getOrganizationConfigBySpace,
  getOrgProposalLabel
} from './organizations';

function org(navItems: any) {
  return { navItems } as any;
}

describe('getOrgProposalLabel', () => {
  it('should return undefined when no organization', () => {
    expect(getOrgProposalLabel(null, 'eth:0xABC')).toBeUndefined();
  });

  it('should return navItems proposals name when set', () => {
    expect(
      getOrgProposalLabel(org({ proposals: { name: 'Votes' } }), 'eth:0xABC')
    ).toBe('Votes');
  });

  it('should return undefined when proposals has no name', () => {
    expect(
      getOrgProposalLabel(org({ proposals: { icon: {} } }), 'eth:0xABC')
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

    expect(getOrgProposalLabel(org(navItems), 'sn:0xPOLLS')).toBe('Polls');
  });

  it('should fall back to proposals name when spaceId does not match', () => {
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

    expect(getOrgProposalLabel(org(navItems), 'eth:0xOTHER')).toBe('Votes');
  });

  it('should not throw on items with string links', () => {
    expect(
      getOrgProposalLabel(
        org({ proposals: { name: 'Votes', link: 'https://docs.example.com' } }),
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

    expect(getOrgProposalLabel(org(navItems), 'eth:0xABC')).toBeUndefined();
  });

  it('should skip items with object link that has no params', () => {
    const navItems = {
      custom: {
        name: 'Custom',
        link: { name: 'space-proposals' }
      }
    };

    expect(getOrgProposalLabel(org(navItems), 'eth:0xABC')).toBeUndefined();
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

    expect(getOrgProposalLabel(org(navItems), 'eth:0xABC')).toBeUndefined();
  });
});

describe('getOrganizationConfigBySpace', () => {
  it('returns the org config when the space is part of one', () => {
    expect(getOrganizationConfigBySpace('s:ens.eth')?.id).toBe('ens');
    expect(
      getOrganizationConfigBySpace(
        'eth:0x323A76393544d5ecca80cd6ef2A560C6a395b7E3'
      )?.id
    ).toBe('ens');
  });

  it('returns null when the space is not part of any org', () => {
    expect(getOrganizationConfigBySpace('s:not-an-org.eth')).toBeNull();
  });
});
