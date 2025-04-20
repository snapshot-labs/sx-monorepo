import crypto from 'crypto';
import { Response } from 'express';

export function rpcSuccess(res: Response, result: any, id: number) {
  res.json({
    jsonrpc: '2.0',
    result,
    id
  });
}

export function rpcError(res: Response, code: number, e: unknown, id: number) {
  res.status(code).json({
    jsonrpc: '2.0',
    error: {
      code,
      message: 'unauthorized',
      data: e
    },
    id
  });
}
export function indexWithAddress(address: string): number {
  const hash = crypto.createHash('sha256').update(address).digest('hex');
  // Convert the hex hash to a number and limit to 9 digits
  // Using modulo 1000000000 ensures number is between 0 and 999999999
  return Number(BigInt(`0x${hash}`) % 1000000000n);
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));
