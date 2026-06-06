import { describe, expect, it } from 'vitest';
import {
  getOrganizationConfigBySpace,
  getOrgProposalLabel,
  resolveSpaceItem,
  type OrganizationConfig
} from './organizations';
import type { Space } from '@/types';

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
  it('returns the org for a member space, null otherwise', () => {
    expect(getOrganizationConfigBySpace('s:ens.eth')?.id).toBe('ens');
    expect(getOrganizationConfigBySpace('s:not-an-org.eth')).toBeNull();
  });
});

describe('resolveSpaceItem', () => {
  it('routes to org overview when space belongs to an org', () => {
    const result = resolveSpaceItem({
      network: 's',
      id: 'ens.eth',
      name: 'ENS Mainnet'
    } as Space);

    expect(result.link).toEqual({ name: 'org', params: { org: 'ens' } });
    expect(result.title).toBe('ENS');
    expect(result.avatarSpace.id).toBe(
      '0x323A76393544d5ecca80cd6ef2A560C6a395b7E3'
    );
    expect(result.avatarSpace.network).toBe('eth');
  });

  it('routes to space overview when space has no org match', () => {
    const space = {
      network: 's',
      id: 'not-an-org.eth',
      name: 'Random DAO'
    } as Space;

    const result = resolveSpaceItem(space);

    expect(result.link).toEqual({
      name: 'space-overview',
      params: { space: 's:not-an-org.eth' }
    });
    expect(result.avatarSpace).toBe(space);
  });

  it('skips auto-detection when org is explicitly null', () => {
    const result = resolveSpaceItem(
      { network: 's', id: 'ens.eth', name: 'ENS Mainnet' } as Space,
      null
    );

    expect(result.link).toEqual({
      name: 'space-overview',
      params: { space: 's:ens.eth' }
    });
  });

  it('uses an explicit org override', () => {
    const customOrg: OrganizationConfig = {
      id: 'custom',
      name: 'Custom Org',
      spaceIds: [{ network: 'eth', id: '0xCUSTOM' }]
    };

    const result = resolveSpaceItem(
      { network: 's', id: 'not-an-org.eth', name: 'Random DAO' } as Space,
      customOrg
    );

    expect(result.link).toEqual({ name: 'org', params: { org: 'custom' } });
    expect(result.title).toBe('Custom Org');
    expect(result.avatarSpace.id).toBe('0xCUSTOM');
  });

});
