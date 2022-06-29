export class SplitUint256 {
  low: bigint;
  high: bigint;

  constructor(low: bigint, high: bigint) {
    this.low = low;
    this.high = high;
  }

  toUint(): bigint {
    const uint = this.low + (this.high << BigInt(128));
    return uint;
  }

  static fromUint(uint: bigint): SplitUint256 {
    const low = uint & ((BigInt(1) << BigInt(128)) - BigInt(1));
    const high = uint >> BigInt(128);
    return new SplitUint256(low, high);
  }

  static fromHex(hex: string): SplitUint256 {
    return SplitUint256.fromUint(BigInt(hex));
  }

  toHex(): string {
    return `0x${this.toUint().toString(16)}`;
  }

  static fromObj(s: { low: bigint; high: bigint }): SplitUint256 {
    return new SplitUint256(s.low, s.high);
  }
}
