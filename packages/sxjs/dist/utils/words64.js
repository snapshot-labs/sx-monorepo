"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uintToWords = exports.wordsToUint = void 0;
/**
 * Converts 4 64 bit words to a 256 bit word
 * @param word1 A 64 bit word
 * @param word2 A 64 bit word
 * @param word3 A 64 bit word
 * @param word4 A 64 bit word
 * @returns A 256 bit word
 */
function wordsToUint(word1, word2, word3, word4) {
    const s3 = BigInt(2 ** 64);
    const s2 = BigInt(2 ** 128);
    const s1 = BigInt(2 ** 192);
    return word4 + word3 * s3 + word2 * s2 + word1 * s1;
}
exports.wordsToUint = wordsToUint;
/**
 * Converts a 256 bit word to a tuple of 4 64 bit words
 * @param uint A 256 bit word
 * @returns A tuple of 4 64 bit words
 */
function uintToWords(uint) {
    const word4 = uint & ((BigInt(1) << BigInt(64)) - BigInt(1));
    const word3 = (uint & ((BigInt(1) << BigInt(128)) - (BigInt(1) << BigInt(64)))) >> BigInt(64);
    const word2 = (uint & ((BigInt(1) << BigInt(192)) - (BigInt(1) << BigInt(128)))) >> BigInt(128);
    const word1 = uint >> BigInt(192);
    return [word1, word2, word3, word4];
}
exports.uintToWords = uintToWords;
