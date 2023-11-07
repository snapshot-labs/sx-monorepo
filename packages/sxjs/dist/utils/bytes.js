"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bytesToHex = exports.hexToBytes = void 0;
function hexToBytes(hex) {
    const bytes = [];
    for (let c = 2; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substring(c, c + 2), 16));
    return bytes;
}
exports.hexToBytes = hexToBytes;
function bytesToHex(bytes) {
    const body = Array.from(bytes, function (byte) {
        return `0${(byte & 0xff).toString(16)}`.slice(-2);
    }).join('');
    return `0x${body}`;
}
exports.bytesToHex = bytesToHex;
