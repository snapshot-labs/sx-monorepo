import createVanillaStrategy from './vanilla';
import createMerkleWhitelistStrategy from './merkleWhitelist';
import createErc20VotesStrategy from './erc20Votes';
import { hexPadLeft } from '../../utils/encoding';
import type { Strategy, NetworkConfig } from '../../types';

export function getStrategy(address: string, networkConfig: NetworkConfig): Strategy | null {
  const strategy = networkConfig.strategies[hexPadLeft(address)];
  if (!strategy) return null;

  if (strategy.type === 'vanilla') {
    return createVanillaStrategy();
  }

  if (strategy.type === 'whitelist') {
    return createMerkleWhitelistStrategy();
  }

  if (strategy.type === 'erc20Votes') {
    return createErc20VotesStrategy();
  }

  return null;
}
