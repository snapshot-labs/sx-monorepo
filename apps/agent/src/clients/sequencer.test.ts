import { verifyTypedData, Wallet } from '@ethersproject/wallet';
import { describe, expect, test } from 'bun:test';
import { isFinalError, signVote } from './sequencer';

const signer = new Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
);

const VOTE = {
  from: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
  space: 'robots.0cf5e.eth',
  proposal:
    '0xd307b62d5241ef0cb3260c65912ffe46bfce7bdbb79ff898331e20756dbd7bef',
  type: 'basic',
  choice: 1,
  reason: 'matches every past renewal'
};

describe('signVote', () => {
  test('signs as the given signer, so the sequencer sees that alias', async () => {
    const { signatureData } = await signVote(VOTE, signer);
    if (!signatureData?.domain) throw new Error('vote was not signed');

    const recovered = verifyTypedData(
      signatureData.domain,
      signatureData.types as Parameters<typeof verifyTypedData>[1],
      signatureData.message as Parameters<typeof verifyTypedData>[2],
      signatureData.signature as string
    );

    expect(recovered).toBe(signer.address);
  });

  test('signs the vote the caller asked for', async () => {
    const { signatureData } = await signVote(VOTE, signer);

    expect(signatureData?.message).toMatchObject({
      from: VOTE.from,
      space: VOTE.space,
      proposal: VOTE.proposal,
      choice: VOTE.choice,
      reason: VOTE.reason,
      app: 'snapshot-agent'
    });
  });
});

describe('isFinalError', () => {
  test('treats a rejection that will not change as final', () => {
    expect(isFinalError('no voting power')).toBe(true);
    expect(isFinalError('wrong alias')).toBe(true);
  });

  test('leaves anything else open to another try', () => {
    expect(isFinalError('too many requests')).toBe(false);
    expect(isFinalError('fetch failed')).toBe(false);
  });
});
