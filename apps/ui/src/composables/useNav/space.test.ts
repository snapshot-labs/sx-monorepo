import { describe, expect, it } from 'vitest';
import { RouteLocationNormalizedLoaded } from 'vue-router';
import { Space } from '@/types';
import provider from './space';
import { NavContext } from './types';

function getItemKeys(routeName: string) {
  const context = {
    route: { name: routeName } as RouteLocationNormalizedLoaded,
    account: '',
    space: { id: 'test.eth', network: 's' } as Space
  } as NavContext;

  return Object.keys(provider.getConfig(context)?.items ?? {});
}

describe('space nav provider', () => {
  it('should show settings to everyone', () => {
    expect(getItemKeys('space-overview')).toContain('settings');
  });

  it.each(['space-settings', 'space-pro'])(
    'should show settings menu on %s',
    routeName => {
      expect(getItemKeys(routeName)).toContain('snapshotPro');
    }
  );
});
