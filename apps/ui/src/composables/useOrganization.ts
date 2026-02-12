import { RouteLocationRaw } from 'vue-router';
import {
  getOrganizationByDomain,
  getOrganizationById,
  Organization
} from '@/helpers/organizations';
import { useSpaceQuery } from '@/queries/spaces';
import { Space } from '@/types';

export const ORG_ROUTES_WITH_SPACE = new Set([
  'org-proposal',
  'org-proposal-overview',
  'org-proposal-votes',
  'org-proposal-execution',
  'org-proposal-discussion',
  'org-editor'
]);

export function toOrgRoute(
  name: string,
  params: Record<string, any> = {}
): { name: string; params: Record<string, any> } | null {
  if (name === 'space-overview') return null;

  if (name.startsWith('space-')) {
    const orgRouteName = name.replace('space-', 'org-');
    const newParams = { ...params };
    if (!ORG_ROUTES_WITH_SPACE.has(orgRouteName)) delete newParams.space;
    return { name: orgRouteName, params: newParams };
  }

  if (name === 'user') {
    return { name: 'org-user-statement', params };
  }

  return null;
}

export function useOrganization() {
  const route = useRoute();

  const isOrgRoute = computed(() => String(route.matched[0]?.name) === 'org');

  const config = computed(() => {
    if (!isOrgRoute.value) return null;
    return (
      getOrganizationByDomain(window.location.hostname) ??
      getOrganizationById(route.params.orgId as string)
    );
  });

  const orgSpaceKeys = computed(() => {
    const org = config.value;
    if (!org) return new Set<string>();
    return new Set(org.spaceIds.map(s => `${s.network}:${s.id}`));
  });

  const spaceQueries = (config.value?.spaceIds ?? []).map((_, i) =>
    useSpaceQuery({
      networkId: computed(() => config.value?.spaceIds[i]?.network ?? null),
      spaceId: computed(() => config.value?.spaceIds[i]?.id ?? null)
    })
  );

  const resolved = computed(() => spaceQueries.every(q => !q.isPending.value));

  const organization = computed<Organization | null>(() => {
    const org = config.value;
    if (!org || !resolved.value) return null;

    const spaces = spaceQueries
      .map(q => q.data.value)
      .filter((s): s is Space => !!s);

    return { ...org, spaces };
  });

  function resolveSpaceRoute(
    to: RouteLocationRaw,
    opts?: { checkSpaceMembership?: boolean }
  ): RouteLocationRaw {
    if (
      !config.value ||
      typeof to === 'string' ||
      !('name' in to) ||
      !to.name
    ) {
      return to;
    }

    if (opts?.checkSpaceMembership) {
      const spaceParam = to.params?.space as string | undefined;
      if (spaceParam && !orgSpaceKeys.value.has(spaceParam)) return to;
    }

    const rewritten = toOrgRoute(to.name.toString(), to.params ?? {});
    return rewritten ? { ...to, ...rewritten } : to;
  }

  return {
    organization,
    resolved,
    resolveSpaceRoute
  };
}
