import { MaybeRefOrGetter } from 'vue';
import { useOrganization } from '@/composables/useOrganization';
import { Space } from '@/types';

export const DEFAULT_PAGE_LABELS = {
  overview: 'Overview',
  proposals: 'Proposals',
  delegates: 'Delegates',
  discussions: 'Discussions',
  treasury: 'Treasury'
} as const;

export type PageKey = keyof typeof DEFAULT_PAGE_LABELS;

export function usePageLabels(space?: MaybeRefOrGetter<Space | undefined>) {
  const { organization } = useOrganization();

  function getPageLabel(key: PageKey, spaceId?: string): string {
    const navItems = organization.value?.navItems;
    if (!navItems) return DEFAULT_PAGE_LABELS[key];

    const resolvedSpace = toValue(space);
    const resolved =
      spaceId ||
      (resolvedSpace && `${resolvedSpace.network}:${resolvedSpace.id}`);

    if (resolved) {
      for (const item of Object.values(navItems)) {
        if (!item.name || !item.link || typeof item.link === 'string') continue;
        const link = item.link as {
          name?: string;
          params?: Record<string, string>;
        };
        if (link.name === `space-${key}` && link.params?.space === resolved) {
          return item.name;
        }
      }
    }

    const name = navItems[key]?.name;
    if (name) return name;

    return DEFAULT_PAGE_LABELS[key];
  }

  return { getPageLabel };
}
