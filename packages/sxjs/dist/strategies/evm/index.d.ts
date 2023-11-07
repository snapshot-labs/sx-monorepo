import type { Propose, Vote, StrategyConfig, Strategy, IndexedConfig } from '../../clients/evm/types';
import type { EvmNetworkConfig } from '../../types';
export declare function getStrategy(address: string, networkConfig: EvmNetworkConfig): Strategy | null;
export declare function getStrategiesWithParams(call: 'propose' | 'vote', strategies: StrategyConfig[], signerAddress: string, data: Propose | Vote, networkConfig: EvmNetworkConfig): Promise<IndexedConfig[]>;
