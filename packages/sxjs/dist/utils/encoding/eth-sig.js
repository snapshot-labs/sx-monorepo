"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRSVFromSig = void 0;
const split_uint256_1 = require("../split-uint256");
// Extracts and returns the `r, s, v` values from a `signature`
function getRSVFromSig(sig) {
    if (sig.startsWith('0x')) {
        sig = sig.substring(2);
    }
    const r = split_uint256_1.SplitUint256.fromHex(`0x${sig.substring(0, 64)}`);
    const s = split_uint256_1.SplitUint256.fromHex(`0x${sig.substring(64, 64 * 2)}`);
    const v = `0x${sig.substring(64 * 2)}`;
    return { r, s, v };
}
exports.getRSVFromSig = getRSVFromSig;
