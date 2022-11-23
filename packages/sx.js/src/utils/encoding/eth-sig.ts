import { SplitUint256 } from '../split-uint256';

// Extracts and returns the `r, s, v` values from a `signature`
export function getRSVFromSig(sig: string) {
  if (sig.startsWith('0x')) {
    sig = sig.substring(2);
  }
  const r = SplitUint256.fromHex('0x' + sig.substring(0, 64));
  const s = SplitUint256.fromHex('0x' + sig.substring(64, 64 * 2));
  const v = `0x${sig.substring(64 * 2)}`;
  return { r, s, v };
}
