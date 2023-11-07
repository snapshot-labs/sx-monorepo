export declare class SplitUint256 {
    low: string;
    high: string;
    constructor(low: string, high: string);
    toUint(): bigint;
    static fromUint(uint: bigint): SplitUint256;
    static fromHex(hex: string): SplitUint256;
    toHex(): string;
    static fromObj(s: {
        low: string;
        high: string;
    }): SplitUint256;
}
