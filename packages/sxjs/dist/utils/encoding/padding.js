"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexPadRight = exports.hexPadLeft = void 0;
function hexPadLeft(s) {
    // Remove prefix
    if (s.startsWith('0x')) {
        s = s.substring(2);
    }
    const numZeroes = 64 - s.length;
    return `0x${'0'.repeat(numZeroes) + s}`;
}
exports.hexPadLeft = hexPadLeft;
function hexPadRight(s) {
    // Remove prefix
    if (s.startsWith('0x')) {
        s = s.substring(2);
    }
    // Odd length, need to prefix with a 0
    if (s.length % 2 != 0) {
        s = `0${s}`;
    }
    const numZeroes = 64 - s.length;
    return `0x${s + '0'.repeat(numZeroes)}`;
}
exports.hexPadRight = hexPadRight;
