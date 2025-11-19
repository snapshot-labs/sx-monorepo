export { pin } from '@snapshot-labs/pineapple';

export type PinFunction = (
  payload: any
) => Promise<{ provider: string; cid: string }>;
