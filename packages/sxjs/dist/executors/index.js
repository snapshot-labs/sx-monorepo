"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExecutionData = void 0;
const vanilla_1 = __importDefault(require("./vanilla"));
const ethRelayer_1 = __importDefault(require("./ethRelayer"));
const avatar_1 = __importDefault(require("./avatar"));
function getExecutionData(type, executorAddress, input) {
    if (type === 'SimpleQuorumVanilla') {
        return (0, vanilla_1.default)().getExecutionData(executorAddress);
    }
    if (['SimpleQuorumAvatar', 'SimpleQuorumTimelock'].includes(type) && input?.transactions) {
        return (0, avatar_1.default)().getExecutionData(executorAddress, input.transactions);
    }
    if (type === 'EthRelayer' && input?.transactions && input.destination) {
        return (0, ethRelayer_1.default)({
            destination: input.destination
        }).getExecutionData(executorAddress, input.transactions);
    }
    throw new Error(`Not enough data to create execution for executor ${executorAddress}`);
}
exports.getExecutionData = getExecutionData;
