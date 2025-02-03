/**
 * Array of enabled networks. Can be defined using ENABLED_NETWORKS environment variable
 * with comma-separated list of network names.
 */
export const ENABLED_NETWORKS = process.env.ENABLED_NETWORKS
  ? process.env.ENABLED_NETWORKS.split(',')
  : null;

/** Infura API key used by default for network nodes. */
export const DEFAULT_INFURA_API_KEY =
  process.env.INFURA_API_KEY || '46a5dd9727bf48d4a132672d3f376146';
