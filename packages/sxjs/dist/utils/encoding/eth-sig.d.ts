import { SplitUint256 } from '../split-uint256';
export declare function getRSVFromSig(sig: string): {
    r: SplitUint256;
    s: SplitUint256;
    v: string;
};
