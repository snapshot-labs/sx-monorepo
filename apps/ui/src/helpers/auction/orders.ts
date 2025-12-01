import { Order } from './types';

type ComparableOrder = Pick<Order, 'userId' | 'buyAmount' | 'sellAmount'>;

/**
 * Compares two orders using same criteria as used in the auction clearing algorithm.
 * Returns -1 if a < b, 1 if a > b, 0 if equal.
 * Criteria are:
 * 1. Price (buyAmount / sellAmount), higher price is better
 * 2. Sell amount, higher sell amount is better
 * 3. User ID, higher user ID is better
 */
export function compareOrders(
  a: ComparableOrder,
  b: ComparableOrder
): -1 | 0 | 1 {
  const buyAmountA = BigInt(a.buyAmount);
  const buyAmountB = BigInt(b.buyAmount);
  const sellAmountA = BigInt(a.sellAmount);
  const sellAmountB = BigInt(b.sellAmount);
  const userIdA = BigInt(a.userId);
  const userIdB = BigInt(b.userId);

  const priceA = buyAmountA * sellAmountB;
  const priceB = buyAmountB * sellAmountA;

  if (priceA < priceB) return 1;
  if (priceA > priceB) return -1;

  if (sellAmountA > sellAmountB) return 1;
  if (sellAmountA < sellAmountB) return -1;

  if (userIdA > userIdB) return 1;
  if (userIdA < userIdB) return -1;

  return 0;
}

export function encodeOrder(order: {
  userId: bigint;
  buyAmount: bigint;
  sellAmount: bigint;
}): string {
  return `0x${order.userId.toString(16).padStart(16, '0')}${order.buyAmount
    .toString(16)
    .padStart(24, '0')}${order.sellAmount.toString(16).padStart(24, '0')}`;
}

export function decodeOrder(bytes: string) {
  return {
    userId: BigInt(`0x${bytes.substring(2, 18)}`).toString(),
    buyAmount: BigInt(`0x${bytes.substring(19, 42)}`).toString(),
    sellAmount: BigInt(`0x${bytes.substring(43, 66)}`).toString()
  };
}
