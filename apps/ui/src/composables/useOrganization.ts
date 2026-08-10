import { useQueries } from '@tanstack/vue-query';
import {
  getOrganizationConfigByDomain,
  getOrganizationConfigById,
  Organization,
  OrganizationConfig
} from '@/helpers/organizations';
import { spaceQueryFn, SPACES_KEYS } from '@/queries/spaces';
import { Space } from '@/types';

const domain = window.location.hostname;

function setup() {
  const route = useRoute();

  const config = computed<OrganizationConfig | null>(() => {
    const byDomain = getOrganizationConfigByDomain(domain);
    if (byDomain) return byDomain;

    if (String(route.matched[0]?.name) !== 'org') return null;
    return getOrganizationConfigById(route.params.org as string);
  });

  // One query per space, sharing the space detail query, so that a space which
  // fails to load (e.g. an API error on its metadata) only fails its own query
  // instead of taking the rest of the organization down with it.
  const spaceQueries = useQueries({
    queries: computed(() =>
      (config.value?.spaceIds ?? []).map(({ network: networkId, id }) => ({
        queryKey: SPACES_KEYS.detail(`${networkId}:${id}`),
        queryFn: spaceQueryFn(networkId, id)
      }))
    )
  });

  // The organization is exposed only once every space query settled, so that
  // the primary space, and the nav derived from it, does not change while the
  // remaining spaces are still loading. A space that already failed an attempt
  // is not waited for: its retries keep running in the background and it joins
  // the organization if one of them succeeds.
  const isLoading = computed(() => {
    const cfg = config.value;
    if (!cfg) return false;

    return (
      spaceQueries.value.length !== cfg.spaceIds.length ||
      spaceQueries.value.some(query => query.isLoading && !query.failureCount)
    );
  });

  const organization = computed<Organization | null>(() => {
    const cfg = config.value;
    if (!cfg || isLoading.value) return null;

    return {
      ...cfg,
      spaces: spaceQueries.value
        .map(query => query.data)
        .filter((space): space is Space => !!space)
    };
  });

  return {
    organization,
    isLoading
  };
}

export const useOrganization = createSharedComposable(setup);
