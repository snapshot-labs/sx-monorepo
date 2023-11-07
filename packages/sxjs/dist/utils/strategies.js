"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtraProposeCalls = exports.getStrategiesWithParams = exports.getStrategies = void 0;
const starknet_1 = require("../strategies/starknet");
const encoding_1 = require("../utils/encoding");
async function getStrategies(data, config) {
    const addresses = await Promise.all(data.strategies.map(id => config.starkProvider.getStorageAt(data.space, (0, encoding_1.getStorageVarAddress)('Voting_voting_strategies_store', id.index.toString(16)))));
    return data.strategies.map((v, i) => ({
        index: v.index,
        address: addresses[i]
    }));
}
exports.getStrategies = getStrategies;
async function getStrategiesWithParams(call, strategies, address, data, config) {
    const results = await Promise.all(strategies.map(async (strategyData) => {
        const strategy = (0, starknet_1.getStrategy)(strategyData.address, config.networkConfig);
        if (!strategy)
            throw new Error('Invalid strategy');
        try {
            const params = await strategy.getParams(call, address, strategyData.address, strategyData.index, strategyData.metadata || null, {
                data
            }, config);
            return {
                index: strategyData.index,
                params
            };
        }
        catch (e) {
            return null;
        }
    }));
    return results.filter(Boolean);
}
exports.getStrategiesWithParams = getStrategiesWithParams;
async function getExtraProposeCalls(strategies, address, data, config) {
    const extraCalls = await Promise.all(strategies.map(strategyData => {
        const strategy = (0, starknet_1.getStrategy)(strategyData.address, config.networkConfig);
        if (!strategy)
            throw new Error('Invalid strategy');
        return strategy.getExtraProposeCalls(address, strategyData.index, {
            data
        }, config);
    }));
    return extraCalls.flat();
}
exports.getExtraProposeCalls = getExtraProposeCalls;
