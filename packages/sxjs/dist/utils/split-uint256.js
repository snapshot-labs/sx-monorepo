"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplitUint256 = void 0;
class SplitUint256 {
    low;
    high;
    constructor(low, high) {
        this.low = low;
        this.high = high;
    }
    toUint() {
        const uint = BigInt(this.low) + (BigInt(this.high) << BigInt(128));
        return uint;
    }
    static fromUint(uint) {
        const low = `0x${(uint & ((BigInt(1) << BigInt(128)) - BigInt(1))).toString(16)}`;
        const high = `0x${(uint >> BigInt(128)).toString(16)}`;
        return new SplitUint256(low, high);
    }
    static fromHex(hex) {
        return SplitUint256.fromUint(BigInt(hex));
    }
    toHex() {
        return `0x${this.toUint().toString(16)}`;
    }
    static fromObj(s) {
        return new SplitUint256(s.low, s.high);
    }
}
exports.SplitUint256 = SplitUint256;
