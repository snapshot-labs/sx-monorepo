"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const abi_1 = require("@ethersproject/abi");
const keccak256_1 = require("@ethersproject/keccak256");
const starknet_1 = require("starknet");
function createEthRelayerExecutor({ destination }) {
    return {
        type: 'ethRelayer',
        getExecutionData(executorAddress, transactions) {
            const abiCoder = new abi_1.AbiCoder();
            const executionParams = abiCoder.encode(['tuple(address to, uint256 value, bytes data, uint8 operation, uint256 salt)[]'], [transactions]);
            const executionHash = starknet_1.uint256.bnToUint256(BigInt((0, keccak256_1.keccak256)(executionParams)));
            return {
                executor: executorAddress,
                executionParams: [
                    destination,
                    `0x${executionHash.low.toString(16).replace('0x', '')}`,
                    `0x${executionHash.high.toString(16).replace('0x', '')}`
                ]
            };
        }
    };
}
exports.default = createEthRelayerExecutor;
