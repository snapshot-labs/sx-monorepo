"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStrategy = void 0;
const vanilla_1 = __importDefault(require("./vanilla"));
const merkleWhitelist_1 = __importDefault(require("./merkleWhitelist"));
const erc20Votes_1 = __importDefault(require("./erc20Votes"));
const encoding_1 = require("../../utils/encoding");
function getStrategy(address, networkConfig) {
    const strategy = networkConfig.strategies[(0, encoding_1.hexPadLeft)(address)];
    if (!strategy)
        return null;
    if (strategy.type === 'vanilla') {
        return (0, vanilla_1.default)();
    }
    if (strategy.type === 'whitelist') {
        return (0, merkleWhitelist_1.default)();
    }
    if (strategy.type === 'erc20Votes') {
        return (0, erc20Votes_1.default)();
    }
    return null;
}
exports.getStrategy = getStrategy;
