import { describe, expect, it, vi } from 'vitest';
import { getPlanItem } from '@/composables/useNav/space';
import { Space } from '@/types';

vi.mock('@/networks', () => ({
  explorePageProtocols: { governor: { protocols: [] } },
  offchainNetworks: ['s']
}));

const DAY = 86400;

function space(fields: Partial<Space>) {
  return { turbo: true, plus: false, credits: 0, ...fields } as Space;
}

describe('getPlanItem', () => {
  it('should link Basic spaces to the upgrade page', () => {
    const item = getPlanItem(space({ turbo: false, turbo_expiration: 0 }));

    expect(item.name).toBe('Upgrade space');
    expect(item.link).toEqual({ name: 'space-upgrade' });
    expect(item.hasWarning).toBeUndefined();
  });

  it('should show Plus credits without a warning', () => {
    const item = getPlanItem(space({ plus: true, credits: 0.5 }));

    expect(item).toMatchObject({
      name: 'Plus',
      value: '0.5 ETH',
      detail: '0.5 ETH left',
      hasWarning: false
    });
  });

  it('should warn when Plus credits cover fewer than 5 proposals', () => {
    const item = getPlanItem(space({ plus: true, credits: 0.03 }));

    expect(item).toMatchObject({
      value: '0.03 ETH',
      detail: 'Only 0.03 ETH left, add credits soon',
      hasWarning: true
    });
  });

  it('should show the Pro end date without a warning', () => {
    const turbo_expiration = Math.floor(Date.now() / 1e3) + 30 * DAY;
    const item = getPlanItem(space({ turbo_expiration }));

    expect(item.name).toBe('Pro');
    expect(item.value).toMatch(/^[1-9]\d? [A-Z][a-z]{2} \d{4}$/);
    expect(item.detail).toMatch(/^Until /);
    expect(item.hasWarning).toBeUndefined();
  });

  it('should warn when Pro expires within 7 days', () => {
    const turbo_expiration = Math.floor(Date.now() / 1e3) + 3 * DAY - 60;
    const item = getPlanItem(space({ turbo_expiration }));

    expect(item).toMatchObject({ value: '3d left', hasWarning: true });
    expect(item.detail).toMatch(/^Expires on /);
  });

  it('should warn when Pro expired within the last 7 days', () => {
    const turbo_expiration = Math.floor(Date.now() / 1e3) - 3 * DAY;
    const item = getPlanItem(space({ turbo: false, turbo_expiration }));

    expect(item).toMatchObject({
      name: 'Pro',
      value: 'Expired',
      hasWarning: true
    });
    expect(item.detail).toMatch(/^Expired on /);
  });

  it('should invite to upgrade once Pro expired more than 7 days ago', () => {
    const turbo_expiration = Math.floor(Date.now() / 1e3) - 10 * DAY;
    const item = getPlanItem(space({ turbo: false, turbo_expiration }));

    expect(item.name).toBe('Upgrade space');
    expect(item.hasWarning).toBeUndefined();
  });
});
