import { useQueryClient } from '@tanstack/vue-query';
import { RouteLocationRaw } from 'vue-router';
import {
  getOrganizationConfigByDomain,
  getOrganizationConfigById,
  Organization,
  OrganizationConfig,
  toOrgRoute
} from '@/helpers/organizations';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

const domain = window.location.hostname;
const orgIdFromHash = window.location.hash.match(/^#\/org\/([^/]+)/)?.[1];

const isOrg = !!getOrganizationConfigByDomain(domain) || !!orgIdFromHash;
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
      getOrganizationConfigByDomain(domain) ??
      getOrganizationConfigById(route.params.orgId as string)
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

  function init() {
    watch(
      config,
      async newConfig => {
        if (!newConfig) return;

        resolved.value = false;
        try {
          spaces.value = await loadSpaces(newConfig, queryClient);
        } finally {
          resolved.value = true;
        }
      },
      { immediate: true }
    );
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

  return {
    init,
    organization,
    resolved,
    resolveSpaceRoute
  };
}
