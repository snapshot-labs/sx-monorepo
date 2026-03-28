export {
  getOrganizationConfigByDomain,
  getOrganizationConfigById,
  toOrgSpaceId
} from './config';
export type { Organization, OrganizationConfig } from './config';
export {
  createCustomRoutes,
  onOrgNavigate,
  resolveOrgLocation
} from './router';
