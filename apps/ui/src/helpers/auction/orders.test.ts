import { describe, expect, it } from 'vitest';
import {
  compareOrders,
  decodeOrder,
  encodeOrder,
  getOrderBuyAmount
} from './orders';

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

describe('getOrderBuyAmount', () => {
  it('should compute buy amount correctly', () => {
    // Decimals: SELL 6, BUY 6
    // Selling 1 SELL at price 0.1 SELL/BUY
    // Expected: 10 BUY
    expect(
      getOrderBuyAmount({
        sellAmount: 1000000n,
        price: 100000n,
        buyAmountDecimals: 6n
      })
    ).toBe(10000000n);

    // Decimals: SELL 6, BUY 6
    // Selling 1 SELL at price 0.3 SELL/BUY
    // Expected: 3.333334 BUY (rounded up)
    expect(
      getOrderBuyAmount({
        sellAmount: 1000000n,
        price: 300000n,
        buyAmountDecimals: 6n
      })
    ).toBe(3333334n);

    // Decimals: SELL 6, BUY 6
    // Selling 1 SELL at price 0.6 SELL/BUY
    // Expected: 1.666667 BUY (rounded up)
    expect(
      getOrderBuyAmount({
        sellAmount: 1000000n,
        price: 600000n,
        buyAmountDecimals: 6n
      })
    ).toBe(1666667n);

    // Decimals: SELL 6, BUY 18
    // Selling 1 SELL at price 10 SELL/BUY
    // Expected: 0.1 BUY
    expect(
      getOrderBuyAmount({
        sellAmount: 1000000n,
        price: 10000000n,
        buyAmountDecimals: 18n
      })
    ).toBe(100000000000000000n);

    // Decimals: SELL 6, BUY 18
    // Selling 0.1 SELL at price 0.3 SELL/BUY
    // Expected: 0.033333333333333334 BUY
    expect(
      getOrderBuyAmount({
        sellAmount: 100000n,
        price: 300000n,
        buyAmountDecimals: 18n
      })
    ).toBe(333333333333333334n);
  });
});
