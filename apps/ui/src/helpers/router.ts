import { RouteParams, RouteParamsRaw, Router } from 'vue-router';

function routeHasParam(name: string, param: string, router: Router): boolean {
  const route = router.getRoutes().find(r => r.name === name);
  if (!route) return false;

  return new RegExp(`:${param}(?=[/)?]|$)`).test(route.path);
}

/**
 * Strips the :space param from routes that don't have :space in their path.
 */
export function stripInvalidSpaceParam<T extends RouteParams | RouteParamsRaw>(
  name: string,
  params: T,
  router: Router
): { name: string; params: T } | null {
  if (!params?.space) return null;
  if (routeHasParam(name, 'space', router)) return null;

  const newParams = { ...params };
  delete newParams.space;
  return { name, params: newParams };
}
