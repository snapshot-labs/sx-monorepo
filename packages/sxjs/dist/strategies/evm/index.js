"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStrategiesWithParams = exports.getStrategy = void 0;
const vanilla_1 = __importDefault(require("./vanilla"));
const comp_1 = __importDefault(require("./comp"));
const ozVotes_1 = __importDefault(require("./ozVotes"));
const merkleWhitelist_1 = __importDefault(require("./merkleWhitelist"));
function getStrategy(address, networkConfig) {
    const strategy = networkConfig.strategies[address];
    if (!strategy)
        return null;
    if (strategy.type === 'vanilla') {
        return (0, vanilla_1.default)();
    }
    if (strategy.type === 'comp') {
        return (0, comp_1.default)();
    }
    if (strategy.type === 'ozVotes') {
        return (0, ozVotes_1.default)();
    }
    if (strategy.type === 'whitelist') {
        return (0, merkleWhitelist_1.default)();
    }
    return null;
}
exports.getStrategy = getStrategy;
async function getStrategiesWithParams(call, strategies, signerAddress, data, networkConfig) {
    const results = await Promise.all(strategies.map(async (strategyConfig) => {
        const strategy = getStrategy(strategyConfig.address, networkConfig);
        if (!strategy)
            throw new Error('Invalid strategy');
        try {
            const params = await strategy.getParams(call, strategyConfig, signerAddress, strategyConfig.metadata || null, data);
            return {
                index: strategyConfig.index,
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
