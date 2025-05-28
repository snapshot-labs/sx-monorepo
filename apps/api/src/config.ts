/**
 * Array of enabled networks. Can be defined using ENABLED_NETWORKS environment variable
 * with comma-separated list of network names.
 */
export const ENABLED_NETWORKS = process.env.ENABLED_NETWORKS
  ? process.env.ENABLED_NETWORKS.split(',')
  : null;
