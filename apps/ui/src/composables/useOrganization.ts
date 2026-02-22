import { useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  getOrganizationConfigByDomain,
  getOrganizationConfigById,
  Organization,
  OrganizationConfig
} from '@/helpers/organizations';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

const domain = window.location.hostname;

export function useOrganization() {
  const route = useRoute();
  const queryClient = useQueryClient();

  const config = computed<OrganizationConfig | null>(() => {
    if (String(route.matched[0]?.name) !== 'org') return null;
    return (
      getOrganizationConfigByDomain(domain) ??
      getOrganizationConfigById(route.params.org as string)
    );
  });

  const { data: spaces, isLoading } = useQuery({
    queryKey: ['org', 'spaces', () => config.value?.id],
    queryFn: async () => {
      const loadedSpaces = await Promise.all(
        config.value!.spaceIds.map(async ({ network: networkId, id }) => {
          const network = getNetwork(networkId);
          const space = await network.api.loadSpace(id);

          if (!space) {
            console.warn(
              `Failed to load space ${networkId}:${id} for organization ${config.value!.id}`
            );
            return null;
          }

          queryClient.setQueryData(
            ['spaces', 'detail', `${space.network}:${space.id}`],
            space
          );

          return space;
        })
      );

      return loadedSpaces.filter((s): s is Space => !!s);
    },
    enabled: () => config.value !== null
  });

  const organization = computed<Organization | null>(() => {
    const org = config.value;
    if (!org || !spaces.value) return null;
    return { ...org, spaces: spaces.value };
  });

  return {
    organization,
    isLoading
  };
}
