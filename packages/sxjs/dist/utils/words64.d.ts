/**
 * Converts 4 64 bit words to a 256 bit word
 * @param word1 A 64 bit word
 * @param word2 A 64 bit word
 * @param word3 A 64 bit word
 * @param word4 A 64 bit word
 * @returns A 256 bit word
 */
export declare function wordsToUint(word1: bigint, word2: bigint, word3: bigint, word4: bigint): bigint;
/**
 * Converts a 256 bit word to a tuple of 4 64 bit words
 * @param uint A 256 bit word
 * @returns A tuple of 4 64 bit words
 */
export declare function uintToWords(uint: bigint): bigint[];
