export {
  getOrganizationConfigByDomain,
  getOrganizationConfigById,
  isOrgSpace
} from './config';
export type { Organization, OrganizationConfig } from './config';
export {
  createCustomRoutes,
  onOrgNavigate,
  resolveOrgLocation
} from './router';
