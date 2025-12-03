import { describe, expect, it } from 'vitest';
import { decodeOrder, encodeOrder } from './orders';

describe('encodeOrder', () => {
  it('should decode encoded order correctly', () => {
    const order = {
      userId: BigInt(83),
      buyAmount: BigInt('1800000000000000000'),
      sellAmount: BigInt('1000000')
    };

    expect(encodeOrder(order)).toEqual(
      '0x00000000000000530000000018fae27693b400000000000000000000000f4240'
    );
  });
});

describe('decodeOrder', () => {
  it('should decode encoded order correctly', () => {
    const encoded =
      '0x00000000000000530000000018fae27693b400000000000000000000000f4240';

    expect(decodeOrder(encoded)).toEqual({
      userId: '83',
      buyAmount: '1800000000000000000',
      sellAmount: '1000000'
    });
  });

  it('should decode encoded order with no gaps correctly', () => {
    const encoded =
      '0x0000000000000053deaddeaddeaddeaddeaddeadbeafbeafbeafbeafbeafbeaf';

    expect(decodeOrder(encoded)).toEqual({
      userId: '83',
      buyAmount: '68915867919823583802853023405',
      sellAmount: '59014614376040491945202532015'
    });
  });
});
