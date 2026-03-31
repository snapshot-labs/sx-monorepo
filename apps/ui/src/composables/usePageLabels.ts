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
type NavLink = { name?: string; params?: Record<string, string> };

export function usePageLabels(space?: MaybeRefOrGetter<Space | undefined>) {
  const { organization } = useOrganization();

  const defaultSpaceId = computed<string | undefined>(() => {
    const s = toValue(space);

    return s && `${s.network}:${s.id}`;
  });

  function getPageLabel(key: PageKey, spaceId?: string): string {
    const navItems = organization.value?.navItems;
    const fallback = navItems?.[key]?.name || DEFAULT_PAGE_LABELS[key];
    const targetSpaceId = spaceId || defaultSpaceId.value;

    if (!targetSpaceId || !navItems) return fallback;

    const match = Object.values(navItems).find(item => {
      if (typeof item.link !== 'object') return false;
      const link = item.link as NavLink;

      return (
        link.name === `space-${key}` && link.params?.space === targetSpaceId
      );
    });

    return match?.name || fallback;
  }

  return { getPageLabel };
}
