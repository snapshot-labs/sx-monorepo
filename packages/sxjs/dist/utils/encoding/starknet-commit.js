"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommit = void 0;
const starknet_1 = require("starknet");
const { computeHashOnElements } = starknet_1.hash;
/**
 * Computes the Pedersen hash of a execution payload for StarkNet
 * This can be used to produce the input for calling the commit method in the StarkNet Commit contract.
 * @param target the target address of the execution
 * @param selector the selector for the method at address target one wants to execute
 * @param calldata the payload for the method at address target one wants to execute
 * @returns A Pedersen hash of the data
 */
function getCommit(target, selector, calldata) {
    return computeHashOnElements([target, selector, ...calldata]);
}
exports.getCommit = getCommit;
