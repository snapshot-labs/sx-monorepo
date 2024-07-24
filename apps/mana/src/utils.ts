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

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));
