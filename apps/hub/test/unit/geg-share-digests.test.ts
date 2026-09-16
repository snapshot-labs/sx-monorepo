/**
 * Cross-language parity for the decryption-share digest.
 *
 * The trap here is the encoding *shape*: the protocol packs the sigmas and the
 * proofs as **two separate ABI encodes, concatenated** rather than one encode of
 * a pair. Encoding them together is the obvious-looking implementation and
 * produces a different byte string — the outer tuple contributes its own offset
 * header — so every keyper's signature would fail to recover and the tally would
 * stall with an authorisation error that says nothing about encoding.
 *
 * The proof is 64 bytes on the wire (`e ‖ z`) and two `uint256` in the digest,
 * which is the second place a plausible implementation diverges.
 *
 * Vectors come from geg's own `write_auth.decryption_share_digest`, including a
 * near-field-order scalar so the big-number path is covered.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  decryptionShareDigest,
  GegDigestError,
  recoverDigestSigner
} from '../../src/helpers/gegDigests';

type ShareCase = {
  name: string;
  electionId: string;
  entries: Array<{ sigma: string; proof: string }>;
  digest: string;
  signature: string;
  signer: string;
};

const fixture: { cases: ShareCase[] } = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/geg-share-digests.json'), 'utf8')
);

describe('GEG-DECRYPT-SHARE-v1 digest', () => {
  it.each(fixture.cases.map(c => [c.name, c] as const))(
    'reproduces the Python digest for %s',
    (_name, c) => {
      expect(
        `0x${decryptionShareDigest({
          electionId: c.electionId,
          entries: c.entries
        }).toString('hex')}`
      ).toBe(c.digest);
    }
  );

  it.each(fixture.cases.map(c => [c.name, c] as const))(
    'recovers the Python signer for %s',
    (_name, c) => {
      expect(
        recoverDigestSigner(Buffer.from(c.digest.slice(2), 'hex'), c.signature)
      ).toBe(c.signer);
    }
  );

  it('covers a scalar near the field order, where a 32-byte assumption would break', () => {
    const c = fixture.cases.find(x => x.name === 'large_scalars');
    expect(c).toBeDefined();
    expect(
      `0x${decryptionShareDigest({
        electionId: c!.electionId,
        entries: c!.entries
      }).toString('hex')}`
    ).toBe(c!.digest);
  });

  // The digest covers every entry, so the candidate a share belongs to is bound
  // by its position. Reordering must not produce the same digest, or a keyper
  // could have its shares applied to the wrong candidates.
  it('binds entry order', () => {
    const c = fixture.cases.find(x => x.entries.length > 1)!;
    const reversed = [...c.entries].reverse();
    expect(
      `0x${decryptionShareDigest({
        electionId: c.electionId,
        entries: reversed
      }).toString('hex')}`
    ).not.toBe(c.digest);
  });

  it.each([
    ['an empty entries list', []],
    ['a short sigma', [{ sigma: '0xdead', proof: `0x${'11'.repeat(64)}` }]],
    ['a short proof', [{ sigma: `0x${'aa'.repeat(96)}`, proof: '0xbeef' }]]
  ])('rejects %s rather than digesting it', (_label, entries) => {
    expect(() =>
      decryptionShareDigest({
        electionId: fixture.cases[0].electionId,
        entries: entries as any
      })
    ).toThrow(GegDigestError);
  });
});
