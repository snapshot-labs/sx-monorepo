import { SplitUint256 } from '../split-uint256';

export function hexPadRight(s: string) {
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
