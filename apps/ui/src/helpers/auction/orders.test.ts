import { describe, expect, it } from 'vitest';
import { compareOrders, decodeOrder, encodeOrder } from './orders';

describe('compareOrders', () => {
  it('should compare by price first (higher is better)', () => {
    const orderA = {
      userId: '1',
      buyAmount: '50',
      sellAmount: '100'
    };
    const orderB = {
      userId: '1',
      buyAmount: '100',
      sellAmount: '100'
    };

    expect(compareOrders(orderA, orderB)).toBe(1);
    expect(compareOrders(orderB, orderA)).toBe(-1);
  });

  it('should compare by buyAmount second (smaller is better)', () => {
    const orderA = {
      userId: '1',
      buyAmount: '100',
      sellAmount: '200'
    };
    const orderB = {
      userId: '1',
      buyAmount: '50',
      sellAmount: '100'
    };

    expect(compareOrders(orderA, orderB)).toBe(-1);
    expect(compareOrders(orderB, orderA)).toBe(1);
  });

  it('should compare by userId third (smaller is better)', () => {
    const orderA = {
      userId: '2',
      buyAmount: '100',
      sellAmount: '200'
    };
    const orderB = {
      userId: '1',
      buyAmount: '100',
      sellAmount: '200'
    };

    expect(compareOrders(orderA, orderB)).toBe(-1);
    expect(compareOrders(orderB, orderA)).toBe(1);
  });

  it('should return 0 if price/sellAmount/userId are the same', () => {
    const order = {
      userId: '1',
      buyAmount: '100',
      sellAmount: '200'
    };

    expect(compareOrders(order, order)).toBe(0);
  });
});

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
