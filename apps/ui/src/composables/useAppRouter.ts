import { RouteLocationRaw } from 'vue-router';
import { resolveOrgLocation } from '@/helpers/organizations';
import { stripInvalidSpaceParam } from '@/helpers/router';

export function useAppRouter() {
  const router = useRouter();
  const { isWhiteLabel } = useWhiteLabel();

  function normalizeLocation(to: RouteLocationRaw): RouteLocationRaw {
    if (typeof to === 'string' || !('name' in to) || !to.name) return to;

    const result = { ...to, params: { ...to.params } };

    if (isWhiteLabel.value) {
      const name = result.name!.toString();

      const stripped = stripInvalidSpaceParam(name, result.params, router);
      if (stripped) result.params = stripped.params;

      if (name === 'user') {
        result.name = 'space-user-statement';
      }

      if (name === 'settings-spaces') {
        result.name = 'settings-contacts';
      }
    }

    return resolveOrgLocation(result, router);
  }

  return {
    ...router,
    resolve: (to: RouteLocationRaw) => router.resolve(normalizeLocation(to)),
    push: (to: RouteLocationRaw) => router.push(normalizeLocation(to)),
    replace: (to: RouteLocationRaw) => router.replace(normalizeLocation(to))
  };
}
