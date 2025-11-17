import { pin } from '@snapshot-labs/pineapple';

export type PinFunction = (
  payload: any
) => Promise<{ provider: string; cid: string }>;

export const pinPineapple: PinFunction = async (payload: any) => {
  const pinned = await pin(payload);
  if (!pinned) throw new Error('Failed to pin');

  return {
    provider: pinned.provider,
    cid: pinned.cid
  };
};
