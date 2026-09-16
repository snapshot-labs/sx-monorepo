/**
 * The eligibility credential, pinned in both directions.
 *
 * `gegAttestation.ts` assembles the signed message itself — the crypto package
 * is an unmodified published dependency and does not expose its transcript
 * bytes. That makes this file the thing standing between a one-character slip in
 * the byte framing and an election where every ballot is silently excluded and
 * the tally comes out as zeros. There is no runtime signal for that failure: the
 * keypers simply reject credentials they cannot verify.
 *
 * So it is checked two ways against the protocol's own corpus:
 *
 *   1. **Their bytes, our verifier.** Reference credentials from
 *      `packages/geg-parity/vectors/attestation/` must verify under the message
 *      this module builds — and the tampered ones must not.
 *   2. **Our bytes, their verifier.** Credentials minted here are emitted as a
 *      fixture that geg's Python `verify_attestation` must accept, via
 *      `scripts/geg/verify-wire-fixtures.py`. That run is a dev-time step — CI
 *      does not depend on a geg checkout — so the assertions here are what keep
 *      the emitted file trustworthy in between.
 *
 * (1) is the load-bearing one: a Schnorr signature is bound to its exact
 * message, so verifying the corpus's own credentials under a message this
 * module built proves the two framings are identical byte-for-byte. (2) catches
 * the rest of the minting path — key handling, hex conventions, field order at
 * the call site.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  G1Point,
  initCurves,
  schnorrKeygen,
  schnorrVerify
} from '@shutter-network/urban-verified-crypto';
import {
  attestationMessage,
  eligibilityPublicKey,
  mintAttestation,
  resetIssuer,
  verifyAttestation
} from '../../../src/helpers/gegAttestation';

const VECTORS = join(
  __dirname,
  '../../../../../packages/geg-parity/vectors/attestation'
);

type AttestationVector = {
  inputs: {
    eligibilityKey: string;
    electionId: string;
    pseudonym: string;
    vk: string;
    weight: number;
    nonce: number;
    scheme: 'ATTESTATION_V1' | 'ATTESTATION_LEGACY';
    signature: string;
    maxWeight: number;
  };
  expected: { verify: boolean };
};

function vector(name: string): AttestationVector {
  return JSON.parse(readFileSync(join(VECTORS, `${name}.json`), 'utf8'));
}

function bytes(hex: string): Uint8Array {
  return new Uint8Array(
    Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex')
  );
}

/** Signature check only — admission policy belongs to the keypers. */
function signatureVerifies(v: AttestationVector): boolean {
  const i = v.inputs;
  const issuer = G1Point.fromBytes(bytes(i.eligibilityKey));
  const sig = bytes(i.signature);
  const R = G1Point.fromBytes(sig.subarray(0, 48));
  let s = 0n;
  for (const b of sig.subarray(48)) s = (s << 8n) | BigInt(b);
  try {
    return schnorrVerify(
      issuer,
      attestationMessage(
        bytes(i.electionId),
        bytes(i.pseudonym),
        bytes(i.vk),
        BigInt(i.weight),
        BigInt(i.nonce)
      ),
      { R, s }
    );
  } finally {
    issuer.destroyWasm();
    R.destroyWasm();
  }
}

describe('ATTESTATION_V1 parity with the protocol corpus', () => {
  beforeAll(async () => {
    await initCurves();
  });

  afterEach(() => {
    delete process.env.TE_ELIGIBILITY_PRIVATE_KEY;
    resetIssuer();
  });

  it('accepts a reference credential', () => {
    expect(signatureVerifies(vector('attestation_v1_valid'))).toBe(true);
  });

  it.each([
    ['attestation_v1_tampered_weight'],
    ['attestation_v1_tampered_nonce'],
    ['attestation_v1_wrong_election']
  ])('rejects %s', name => {
    expect(signatureVerifies(vector(name))).toBe(false);
  });

  it('rejects a tampered voter key', () => {
    const v = vector('attestation_v1_valid');
    // Flip the last byte of vk. It is a compressed G1 point, so mutate a
    // low-order byte and keep the encoding flags intact.
    const vk = bytes(v.inputs.vk);
    vk[vk.length - 1] ^= 0x01;
    v.inputs.vk = Buffer.from(vk).toString('hex');
    // Either the point no longer decodes, or it decodes and the signature is
    // over a different message. Both are rejections; neither may be an accept.
    let verified: boolean;
    try {
      verified = signatureVerifies(v);
    } catch {
      verified = false;
    }
    expect(verified).toBe(false);
  });

  // The other direction. Verifying our own credential with our own verifier
  // would pass under any self-consistent framing, so what closes the loop is
  // geg's *Python* verifier accepting credentials minted here: this emits the
  // fixture `scripts/geg/verify-wire-fixtures.py` feeds to `verify_attestation`.
  // The assertions below are what makes the emitted file trustworthy; the
  // cross-language run is a dev-time step, not a CI dependency on geg.
  it('mints credentials this repo would itself accept, and emits the geg fixture', async () => {
    const ISSUER_SK =
      '0x0000000000000000000000000000000000000000000000000000000000002a2a';
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
    resetIssuer();

    const eligibilityKey = await eligibilityPublicKey();
    const electionId =
      '0x1111111111111111111111111111111111111111111111111111111111111111';
    const pseudonym =
      '0x2222222222222222222222222222222222222222222222222222222222222222';
    const voter = schnorrKeygen(0x5151n);
    const vk = `0x${Buffer.from(voter.vk.toBytes()).toString('hex')}`;
    voter.vk.destroyWasm();

    const cases = [
      { name: 'v1_weight1_nonce1', weight: 1n, nonce: 1n },
      { name: 'v1_weight5_nonce1', weight: 5n, nonce: 1n },
      {
        name: 'v1_weight_at_cap',
        weight: 9007199254740991n,
        nonce: 1770000000n
      }
    ];

    const issuer = G1Point.fromBytes(bytes(eligibilityKey));
    const emitted: Array<Record<string, unknown>> = [];
    try {
      for (const c of cases) {
        const signature = await mintAttestation({
          electionId,
          pseudonym,
          vk,
          weight: c.weight,
          nonce: c.nonce
        });
        const sig = bytes(signature);
        const R = G1Point.fromBytes(sig.subarray(0, 48));
        let s = 0n;
        for (const b of sig.subarray(48)) s = (s << 8n) | BigInt(b);
        const message = attestationMessage(
          bytes(electionId),
          bytes(pseudonym),
          bytes(vk),
          c.weight,
          c.nonce
        );
        // Never emit a credential we would not accept ourselves.
        expect(schnorrVerify(issuer, message, { R, s })).toBe(true);
        R.destroyWasm();

        emitted.push({
          name: c.name,
          scheme: 'ATTESTATION_V1',
          electionId,
          pseudonym,
          vk,
          weight: c.weight.toString(),
          nonce: c.nonce.toString(),
          signature,
          expected: { verify: true }
        });
      }
    } finally {
      issuer.destroyWasm();
    }

    if (process.env.WRITE_ATTESTATION_FIXTURE) {
      writeFileSync(
        join(__dirname, '..', '..', 'fixtures', 'ts-minted-attestations.json'),
        `${JSON.stringify(
          {
            description:
              "ATTESTATION_V1 credentials minted by the sequencer. geg's Python verify_attestation must accept every one.",
            eligibilityKey,
            cases: emitted
          },
          null,
          2
        )}\n`
      );
    }

    expect(emitted).toHaveLength(cases.length);
  });
});

describe('verifyAttestation — the ingest self-check', () => {
  const ISSUER_SK =
    '0x0000000000000000000000000000000000000000000000000000000000002a2a';
  const electionId =
    '0x1111111111111111111111111111111111111111111111111111111111111111';
  const pseudonym =
    '0x2222222222222222222222222222222222222222222222222222222222222222';
  let vk: string;

  beforeAll(() => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
    resetIssuer();
    const voter = schnorrKeygen(0x5151n);
    vk = `0x${Buffer.from(voter.vk.toBytes()).toString('hex')}`;
    voter.vk.destroyWasm();
  });

  const base = () => ({
    electionId,
    pseudonym,
    vk,
    weight: 7n,
    nonce: 1700000000n
  });

  it('accepts a credential it just minted', async () => {
    const args = base();
    const signature = await mintAttestation(args);
    await expect(verifyAttestation({ ...args, signature })).resolves.toBe(true);
  });

  // Every field is bound into the signed message, so changing any one of them
  // must break verification. A field that can be altered without detection is a
  // field the committee is not actually relying on.
  it.each([
    ['weight', { weight: 8n }],
    ['nonce', { nonce: 1700000001n }],
    [
      'electionId',
      {
        electionId:
          '0x3333333333333333333333333333333333333333333333333333333333333333'
      }
    ],
    [
      'pseudonym',
      {
        pseudonym:
          '0x4444444444444444444444444444444444444444444444444444444444444444'
      }
    ]
  ])('rejects when %s is altered after signing', async (_label, override) => {
    const args = base();
    const signature = await mintAttestation(args);
    await expect(
      verifyAttestation({
        ...args,
        ...override,
        signature
      })
    ).resolves.toBe(false);
  });

  // There is no upper bound left to enforce: the protocol's per-election
  // `maxWeight` is gone, so a large weight is simply a large weight. The lower
  // bound survives, and is what a malformed credential trips.
  it('accepts a validly signed weight of any size', async () => {
    const args = { ...base(), weight: 1_000_000_000n };
    const signature = await mintAttestation(args);
    await expect(verifyAttestation({ ...args, signature })).resolves.toBe(true);
  });

  // The lower bound is enforced where a credential is created, so it cannot be
  // reached through `verifyAttestation` with a genuinely minted one — asserting it
  // at the mint side is the reachable form of the same guarantee.
  it('refuses to mint a weight below 1', async () => {
    await expect(mintAttestation({ ...base(), weight: 0n })).rejects.toThrow(
      /weight must be >= 1/
    );
  });

  // Malformed input must return false rather than throw: this runs inside the
  // vote writer, where an exception and a rejection are handled differently.
  it.each([
    ['not hex', 'nonsense'],
    ['wrong length', '0xdeadbeef'],
    ['empty', '0x']
  ])('returns false for a %s signature', async (_label, signature) => {
    await expect(verifyAttestation({ ...base(), signature })).resolves.toBe(
      false
    );
  });

  it('rejects a signature from a different issuer', async () => {
    const args = base();
    const signature = await mintAttestation(args);
    process.env.TE_ELIGIBILITY_PRIVATE_KEY =
      '0x0000000000000000000000000000000000000000000000000000000000009999';
    resetIssuer();
    try {
      await expect(verifyAttestation({ ...args, signature })).resolves.toBe(
        false
      );
    } finally {
      process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
      resetIssuer();
    }
  });
});
