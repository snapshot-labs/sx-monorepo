import { RouteLocationRaw } from 'vue-router';
import { getOrganizationById } from '@/helpers/organizations';

const ORG_ROUTES_WITH_SPACE = new Set([
  'org-proposal',
  'org-proposal-overview',
  'org-proposal-votes',
  'org-proposal-execution',
  'org-proposal-discussion',
  'org-editor'
]);

export function useRouteContext() {
  const route = useRoute();
  const { organization: whiteLabelOrg } = useWhiteLabel();

  const isOrgContext = computed(() => String(route.matched[0]?.name) === 'org');

  const orgDefinition = computed(() => {
    if (!isOrgContext.value) return null;
    if (whiteLabelOrg.value) return whiteLabelOrg.value;
    const orgId = route.params.orgId as string;
    return orgId ? getOrganizationById(orgId) : null;
  });

  const orgSpaceKeys = computed(() => {
    const org = orgDefinition.value;
    if (!org) return new Set<string>();
    return new Set([
      `${org.primarySpace.network}:${org.primarySpace.id}`,
      `${org.secondarySpace.network}:${org.secondarySpace.id}`
    ]);
  });

  function resolveSpaceRoute(
    to: RouteLocationRaw,
    opts?: { checkSpaceMembership?: boolean }
  ): RouteLocationRaw {
    if (
      !isOrgContext.value ||
      typeof to === 'string' ||
      !('name' in to) ||
      !to.name
    ) {
      return to;
    }

    const name = to.name.toString();

    if (name.startsWith('space-')) {
      if (opts?.checkSpaceMembership) {
        const spaceParam = to.params?.space as string | undefined;
        if (spaceParam && !orgSpaceKeys.value.has(spaceParam)) return to;
      }

      const orgName = name.replace('space-', 'org-');
      const params = { ...to.params };
      if (!ORG_ROUTES_WITH_SPACE.has(orgName)) delete params.space;

      return { ...to, name: orgName, params };
    }

    if (name === 'user') {
      return { ...to, name: 'org-user-statement' };
    }

    return to;
  }

  return { isOrgContext, orgDefinition, orgSpaceKeys, resolveSpaceRoute };
}
