export const UI_URL = process.env.UI_URL || 'https://snapshot.box';

export const MANA_URL = process.env.VITE_MANA_URL || 'https://mana.box';

/**
 * Array of enabled networks. Can be defined using ENABLED_NETWORKS environment variable
 * with comma-separated list of network names.
 */
export const ENABLED_NETWORKS = process.env.ENABLED_NETWORKS
  ? process.env.ENABLED_NETWORKS.split(',')
  : null;
