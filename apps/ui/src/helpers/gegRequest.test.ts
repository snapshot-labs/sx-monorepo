/**
 * Cross-language parity for the request digest the admin's retry is signed over.
 *
 * The vectors in `__fixtures__/geg-request-digests.json` come from geg's own
 * `geg.core.authz.request_digest`, with signatures over them, so this locks three
 * things at once: the digest bytes, the EIP-191 convention (sign the raw 32 bytes,
 * not the hex string), and the address a verifier recovers.
 *
 * Drift here is silent in the worst way. The button would produce a well-formed
 * signature, the hub would recover *some* address, and the write would be refused
 * as `not_the_admin` — a message that points at the wrong thing entirely. The admin
 * would conclude their wallet is not the admin.
 *
 * Regenerate with geg's venv if the digest definition changes:
 *   .venv/bin/python -c "from geg.core.authz import request_digest; ..."
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hexlify } from '@ethersproject/bytes';
import { verifyMessage } from '@ethersproject/wallet';
import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/geg-request-digests.json';
import { requestDigest, requestNoncePayload } from './gegRequest';

type RequestCase = {
  name: string;
  op: string;
  electionId: string;
  payload: string;
  digest: string;
  signature: string;
  signer: string;
};

const cases = fixture.cases as RequestCase[];

function bytesOf(c: RequestCase): Uint8Array {
  const payload =
    c.payload === '0x'
      ? new Uint8Array(0)
      : Uint8Array.from(
          c.payload
            .slice(2)
            .match(/.{2}/g)!
            .map(b => parseInt(b, 16))
        );
  return requestDigest(c.op, c.electionId, payload);
}

function digestOf(c: RequestCase): string {
  return `0x${Buffer.from(bytesOf(c)).toString('hex')}`;
}

describe('GEG-REQUEST-v1 digest', () => {
  it.each(cases.map(c => [c.name, c] as const))(
    'reproduces the Python digest for %s',
    (_name, c) => {
      expect(digestOf(c)).toBe(c.digest);
    }
  );

  it.each(cases.map(c => [c.name, c] as const))(
    'recovers the Python signer for %s',
    (_name, c) => {
      expect(verifyMessage(bytesOf(c), c.signature)).toBe(c.signer);
    }
  );

  // The property the whole direction-split rests on: the op is inside the signed
  // message, so a stall signature is not a resume signature.
  it('gives stall and resume different digests for the same election', () => {
    const stall = cases.find(c => c.name === 'tally_stall')!;
    const resume = cases.find(c => c.name === 'tally_resume')!;
    expect(stall.electionId).toBe(resume.electionId);
    expect(digestOf(stall)).not.toBe(digestOf(resume));
  });

  // Length framing, checked where it actually matters: two (op, eid) pairs whose
  // naive concatenation is identical must not collide.
  it('separates ops that share a prefix', () => {
    const a = cases.find(c => c.name === 'framing_prefix_a')!;
    const b = cases.find(c => c.name === 'framing_prefix_b')!;
    expect(digestOf(a)).not.toBe(digestOf(b));
    expect(digestOf(a)).not.toBe(digestOf(cases[0]));
  });

  it('binds the election, so a resume cannot be replayed onto another proposal', () => {
    const here = cases.find(c => c.name === 'tally_resume')!;
    const there = cases.find(c => c.name === 'tally_resume_other_election')!;
    expect(digestOf(here)).not.toBe(digestOf(there));
  });

  it.each([
    ['a short id', '0xdead'],
    ['an over-long id', `0x${'de'.repeat(33)}`]
  ])('rejects %s rather than padding it', (_label, id) => {
    expect(() => requestDigest('tally_resume', id)).toThrow(/32 bytes/);
  });
});

// The browser holds a third copy of the freshness encoding, because the admin's retry
// is the one protocol write a human signs in a wallet. A byte of drift here means the
// hub cannot reproduce the digest and the retry is refused as `not_the_admin` — which
// reads like the wrong wallet rather than an encoding bug. Vectors from geg's Python.
describe('requestNoncePayload — parity with geg', () => {
  const vectors = JSON.parse(
    readFileSync(
      join(
        __dirname,
        '../../../../packages/geg-parity/vectors/request-nonce.json'
      ),
      'utf8'
    )
  ) as {
    cases: {
      name: string;
      op: string;
      electionId: string;
      payload: string;
      digest: string;
    }[];
  };

  it.each(vectors.cases.map(c => [c.name, c] as const))(
    'reproduces %s',
    (_name, c) => {
      const issuedAt = Number(BigInt(c.payload));
      expect(hexlify(requestNoncePayload(issuedAt))).toBe(c.payload);
      expect(
        hexlify(
          requestDigest(c.op, c.electionId, requestNoncePayload(issuedAt))
        )
      ).toBe(c.digest);
    }
  );

  it('refuses a non-integer or negative timestamp', () => {
    expect(() => requestNoncePayload(-1)).toThrow();
    expect(() => requestNoncePayload(1.5)).toThrow();
  });
});
