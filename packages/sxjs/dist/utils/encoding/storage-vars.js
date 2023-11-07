"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.offsetStorageVar = exports.getStorageVarAddress = void 0;
const starknet_1 = require("starknet");
const bn_js_1 = __importDefault(require("bn.js"));
const MAX_STORAGE_ITEM_SIZE = 256n;
const ADDR_BOUND = 2n ** 251n - MAX_STORAGE_ITEM_SIZE;
/**
 * Returns the storage address of a StarkNet storage variable given its name and arguments.
 * https://github.com/starkware-libs/cairo-lang/blob/d61255f32a7011e9014e1204471103c719cfd5cb/src/starkware/starknet/public/abi.py#L60-L70
 * @param varName storage_var name
 * @param args additional arguments
 */
function getStorageVarAddress(varName, ...args) {
    let res = starknet_1.hash.starknetKeccak(varName);
    for (const arg of args) {
        const prefixedArg = `0x${arg.replace('0x', '')}`;
        const computedHash = starknet_1.ec.starkCurve.pedersen(res, prefixedArg);
        res = BigInt(computedHash);
    }
    return (res % ADDR_BOUND).toString();
}
exports.getStorageVarAddress = getStorageVarAddress;
function offsetStorageVar(address, offset) {
    return new bn_js_1.default(address, 'be').add(new bn_js_1.default(offset)).toString();
}
exports.offsetStorageVar = offsetStorageVar;
