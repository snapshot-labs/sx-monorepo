import { SplitUint256 } from './split-uint256';
export declare class IntsSequence {
    values: string[];
    bytesLength: number;
    constructor(values: string[], bytesLength: number);
    toSplitUint256(): SplitUint256;
    asStrings(): string[];
    static fromString(str: string): IntsSequence;
    static LEFromString(str: string): IntsSequence;
    static fromBytes(bytes: number[]): IntsSequence;
    static fromUint(uint: bigint): IntsSequence;
}
