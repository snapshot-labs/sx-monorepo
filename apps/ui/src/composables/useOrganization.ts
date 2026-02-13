import { useQueryClient } from '@tanstack/vue-query';
import { RouteLocationRaw } from 'vue-router';
import {
  getOrganizationByDomain,
  getOrganizationById,
  Organization,
  OrganizationConfig
} from '@/helpers/organizations';
import { getNetwork } from '@/networks';
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

const domain = window.location.hostname;
const orgIdFromHash = window.location.hash.match(/^#\/org\/([^/]+)/)?.[1];

const isOrg = !!getOrganizationByDomain(domain) || !!orgIdFromHash;
const resolved = ref(!isOrg);
const spaces = ref<Space[]>([]);

async function loadSpaces(
  config: OrganizationConfig,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<Space[]> {
  const loadedSpaces = await Promise.all(
    config.spaceIds.map(async ({ network: networkId, id }) => {
      const network = getNetwork(networkId);
      const space = await network.api.loadSpace(id);

      if (space) {
        queryClient.setQueryData(
          ['spaces', 'detail', `${space.network}:${space.id}`],
          space
        );
      }

      return space;
    })
  );

  return loadedSpaces.filter((s): s is Space => !!s);
}

export function useOrganization() {
  const route = useRoute();
  const queryClient = useQueryClient();

  const isOrgRoute = computed(() => String(route.matched[0]?.name) === 'org');

  const config = computed(() => {
    if (!isOrgRoute.value) return null;
    return (
      getOrganizationByDomain(domain) ??
      getOrganizationById(route.params.orgId as string)
    );
  });

  const orgSpaceKeys = computed(() => {
    const org = config.value;
    if (!org) return new Set<string>();
    return new Set(org.spaceIds.map(s => `${s.network}:${s.id}`));
  });

  const organization = computed<Organization | null>(() => {
    const org = config.value;
    if (!org || !resolved.value) return null;
    return { ...org, spaces: spaces.value };
  });

  async function init() {
    if (resolved.value) return;

    try {
      const org =
        getOrganizationByDomain(domain) ??
        (orgIdFromHash ? getOrganizationById(orgIdFromHash) : null);

      if (!org) return;

      spaces.value = await loadSpaces(org, queryClient);
    } finally {
      resolved.value = true;
    }
  }

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

  async function loadOrgSpaces(org: OrganizationConfig) {
    resolved.value = false;
    try {
      spaces.value = await loadSpaces(org, queryClient);
    } finally {
      resolved.value = true;
    }
  }

  return {
    init,
    loadOrgSpaces,
    organization,
    resolved,
    resolveSpaceRoute
  };
}
