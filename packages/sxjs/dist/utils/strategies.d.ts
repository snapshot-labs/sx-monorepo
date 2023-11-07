import type { Propose, Vote, ClientConfig, StrategiesAddresses, StrategyConfig, IndexedConfig } from '../types';
export declare function getStrategies(data: Propose | Vote, config: ClientConfig): Promise<StrategiesAddresses>;
export declare function getStrategiesWithParams(call: 'propose' | 'vote', strategies: StrategyConfig[], address: string, data: Propose | Vote, config: ClientConfig): Promise<IndexedConfig[]>;
export declare function getExtraProposeCalls(strategies: StrategiesAddresses, address: string, data: Propose, config: ClientConfig): Promise<import("starknet").Call[]>;
