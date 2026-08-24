import { verifyTypedData } from '@ethersproject/wallet';
import { describe, expect, test } from 'bun:test';
import { AGENT_SIGNER_ADDRESS, isFinalError, signVote } from './sequencer';

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
  test('signs as the agent, so the sequencer sees our alias', async () => {
    const { signatureData } = await signVote(VOTE);
    if (!signatureData?.domain) throw new Error('vote was not signed');

    const signer = verifyTypedData(
      signatureData.domain,
      signatureData.types as Parameters<typeof verifyTypedData>[1],
      signatureData.message as Parameters<typeof verifyTypedData>[2],
      signatureData.signature as string
    );

    expect(signer.toLowerCase()).toBe(AGENT_SIGNER_ADDRESS.toLowerCase());
  });

  test('signs the vote the caller asked for', async () => {
    const { signatureData } = await signVote(VOTE);

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
