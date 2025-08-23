import { SplitUint256 } from '../split-uint256';

// Extracts and returns the `r, s, v` values from a `signature`
export function getRSVFromSig(sig: string) {
  if (sig.startsWith('0x')) {
    sig = sig.substring(2);
  }

  // NOTE: v needs to be 27 or 28
  // Some wallets use 0 or 1 instead, so we need to map it.
  let v = parseInt(`0x${sig.substring(64 * 2)}`, 16);
  v = v < 27 ? v + 27 : v;

  const r = SplitUint256.fromHex(`0x${sig.substring(0, 64)}`);
  const s = SplitUint256.fromHex(`0x${sig.substring(64, 64 * 2)}`);

  return { r, s, v: `0x${v.toString(16)}` };
}
