"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const abi_1 = require("@ethersproject/abi");
function createAvatarExecutor() {
    return {
        type: 'avatar',
        getExecutionData(executorAddress, transactions) {
            const abiCoder = new abi_1.AbiCoder();
            const executionParams = abiCoder.encode(['tuple(address to, uint256 value, bytes data, uint8 operation, uint256 salt)[]'], [transactions]);
            return {
                executor: executorAddress,
                executionParams: [executionParams]
            };
        }
    };
}
exports.default = createAvatarExecutor;
