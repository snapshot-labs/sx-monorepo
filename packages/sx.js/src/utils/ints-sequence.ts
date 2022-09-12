import { SplitUint256 } from './split-uint256';
import { bytesToHex, hexToBytes } from './bytes';

export class IntsSequence {
  values: string[];
  bytesLength: number;

  constructor(values: string[], bytesLength: number) {
    this.values = values;
    this.bytesLength = bytesLength;
  }

  toSplitUint256(): SplitUint256 {
    const rem = this.bytesLength % 8;
    let uint = BigInt(this.values[this.values.length - 1]);
    let shift = BigInt(0);
    if (rem == 0) {
      shift += BigInt(64);
    } else {
      shift += BigInt(rem * 8);
    }
    for (let i = 0; i < this.values.length - 1; i++) {
      uint += BigInt(this.values[this.values.length - 2 - i]) << BigInt(shift);
      shift += BigInt(64);
    }
    return SplitUint256.fromUint(uint);
  }

  asStrings(): string[] {
    return this.values.map((s) => {
      let str = '';
      for (let n = 2; n < s.length; n += 2) {
        str += String.fromCharCode(parseInt(s.substring(n, n + 2), 16));
      }
      return str;
    });
  }

  static fromString(str: string): IntsSequence {
    const intsArray: string[] = [];
    for (let i = 0; i < str.length; i += 8) {
      const bytes = Buffer.from(str.slice(i, i + 8));
      intsArray.push(bytesToHex(bytes));
    }
    return new IntsSequence(intsArray, str.length);
  }

  static LEFromString(str: string): IntsSequence {
    const intsArray: string[] = [];
    for (let i = 0; i < str.length; i += 8) {
      const bytes = Buffer.from(str.slice(i, i + 8));
      const leBytes = bytes.reverse();
      intsArray.push(bytesToHex(leBytes));
    }
    return new IntsSequence(intsArray, str.length);
  }

  static fromBytes(bytes: number[]): IntsSequence {
    const intsArray: string[] = [];
    for (let i = 0; i < bytes.length; i += 8) {
      intsArray.push(bytesToHex(bytes.slice(i + 0, i + 8)));
    }
    return new IntsSequence(intsArray, bytes.length);
  }

  static fromUint(uint: bigint): IntsSequence {
    let hex = uint.toString(16);
    if (hex.length % 2 != 0) {
      hex = `0x0${hex}`;
    } else {
      hex = `0x${hex}`;
    }
    return IntsSequence.fromBytes(hexToBytes(hex));
  }
}
