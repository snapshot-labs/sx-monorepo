import createErc20VotesStrategy from './erc20Votes';
import createEvmSlotValueStrategy from './evmSlotValue';
import createMerkleWhitelistStrategy from './merkleWhitelist';
import createOzVotesStorageProofStrategy from './ozVotesStorageProof';
import createVanillaStrategy from './vanilla';
import { Strategy } from '../../clients/starknet/types';
import { NetworkConfig } from '../../types';
import { hexPadLeft } from '../../utils/encoding';

export function getStrategy(
  address: string,
  networkConfig: NetworkConfig
): Strategy | null {
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

  if (strategy.type === 'evmSlotValue') {
    return createEvmSlotValueStrategy();
  }

  if (strategy.type === 'ozVotesStorageProof') {
    return createOzVotesStorageProofStrategy(strategy.params);
  }

  return null;
}
