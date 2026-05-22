import { NextFunction, Request, Response } from 'express';
import { sendError, sha256 } from './utils';

export const ERROR_MESSAGE = 'request already being processed';
export const queue: Set<string> = new Set();
const hashedBody = (req: Request): string =>
  sha256(JSON.stringify(req.body || {}));

export default async function duplicateRequestPreventor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const value = hashedBody(req);

  if (queue.has(value)) return sendError(res, ERROR_MESSAGE, 425);

  queue.add(value);
  next();
}

export async function cleanup(req: Request, res: Response, next: NextFunction) {
  queue.delete(hashedBody(req));
  next();
}
