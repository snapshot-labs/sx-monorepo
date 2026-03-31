import { MaybeRefOrGetter } from 'vue';
import { useOrganization } from '@/composables/useOrganization';
import { Space } from '@/types';

const DEFAULT_PAGE_NAMES = {
  overview: 'Overview',
  proposals: 'Proposals',
  delegates: 'Delegates',
  discussions: 'Discussions',
  treasury: 'Treasury',
  leaderboard: 'Leaderboard',
  settings: 'Settings'
} as const;

export type PageKey = keyof typeof DEFAULT_PAGE_NAMES;

export function usePageNames(space?: MaybeRefOrGetter<Space | undefined>) {
  const { organization } = useOrganization();

  function getPageName(key: PageKey): string {
    const navItems = organization.value?.navItems;
    if (!navItems) return DEFAULT_PAGE_NAMES[key];

    const resolvedSpace = toValue(space);
    if (resolvedSpace) {
      const spaceId = `${resolvedSpace.network}:${resolvedSpace.id}`;
      for (const [, item] of Object.entries(navItems)) {
        if (!item.name || !item.link || typeof item.link === 'string') continue;
        const link = item.link as {
          name?: string;
          params?: Record<string, string>;
        };
        if (link.name === `space-${key}` && link.params?.space === spaceId) {
          return item.name;
        }
      }
    }

    if (navItems[key]?.name) return navItems[key].name!;

    return DEFAULT_PAGE_NAMES[key];
  }

  return { getPageName };
}
