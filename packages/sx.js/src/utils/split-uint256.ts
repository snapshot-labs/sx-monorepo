export class SplitUint256 {
  low: string;
  high: string;

  constructor(low: string, high: string) {
    this.low = low;
    this.high = high;
  }

  toUint(): bigint {
    const uint = BigInt(this.low) + (BigInt(this.high) << BigInt(128));
    return uint;
  }

  static fromUint(uint: bigint): SplitUint256 {
    const low = `0x${(uint & ((BigInt(1) << BigInt(128)) - BigInt(1))).toString(16)}`;
    const high = `0x${(uint >> BigInt(128)).toString(16)}`;
    return new SplitUint256(low, high);
  }

  static fromHex(hex: string): SplitUint256 {
    return SplitUint256.fromUint(BigInt(hex));
  }

  toHex(): string {
    return `0x${this.toUint().toString(16)}`;
  }

  static fromObj(s: { low: string; high: string }): SplitUint256 {
    return new SplitUint256(s.low, s.high);
  }
}
