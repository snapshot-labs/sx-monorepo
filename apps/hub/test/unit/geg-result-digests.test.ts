/**
 * Cross-language parity for the published-result digest, and the precision trap
 * that comes with it.
 *
 * This digest changed upstream (`b94e63c`). The old one signed only the pair
 * (operation, election), so a single captured signature authorised *any* totals
 * for that proposal — anyone replaying it could publish a different outcome.
 * The current form binds the totals, the crediting keyper indices, and the BSGS
 * bound.
 *
 * Binding the totals makes their *exactness* part of authorisation, which is
 * where JavaScript becomes a hazard: totals are sums over weighted ballots and
 * pass 2^53 in a large election, and `JSON.parse` rounds silently at that point.
 * A rounded total yields a different digest, so the hub would reject a
 * perfectly valid result and the election could never publish — reported as an
 * authorisation failure, with nothing pointing at the parser. The fixture
 * therefore includes a total above 2^53 and is read with the same
 * precision-preserving parser the route uses.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseJsonPreservingBigInts } from '../../src/helpers/bigIntJson';
import {
  GegDigestError,
  recoverDigestSigner,
  resultDigest
} from '../../src/helpers/gegDigests';

type ResultCase = {
  name: string;
  electionId: string;
  result: {
    totals: Array<number | string>;
    keyperIndices: number[];
    bsgsBound: number | string;
  };
  digest: string;
  signature: string;
  signer: string;
};

const fixture: { cases: ResultCase[] } = parseJsonPreservingBigInts(
  readFileSync(join(__dirname, '../fixtures/geg-result-digests.json'), 'utf8')
);

const digestOf = (c: ResultCase) =>
  `0x${resultDigest({ electionId: c.electionId, ...c.result }).toString('hex')}`;

describe('GEG-RESULT-v1 digest', () => {
  it.each(fixture.cases.map(c => [c.name, c] as const))(
    'reproduces the Python digest for %s',
    (_name, c) => expect(digestOf(c)).toBe(c.digest)
  );

  it.each(fixture.cases.map(c => [c.name, c] as const))(
    'recovers the Python signer for %s',
    (_name, c) =>
      expect(
        recoverDigestSigner(Buffer.from(c.digest.slice(2), 'hex'), c.signature)
      ).toBe(c.signer)
  );

  it('carries a total above 2^53, which a JSON number cannot hold exactly', () => {
    const big = fixture.cases.find(c => c.name === 'large_totals')!;
    expect(String(big.result.totals[0])).toBe('9007199254740993');
    expect(digestOf(big)).toBe(big.digest);
  });

  // Each of these is an outcome the publisher did not sign. The digest has to
  // separate them, or a captured signature could be paired with different totals.
  it('binds the totals', () => {
    const c = fixture.cases[0];
    expect(
      digestOf({ ...c, result: { ...c.result, totals: [101, 0, 42] } })
    ).not.toBe(c.digest);
  });

  it('binds which keypers were credited with the decryption', () => {
    const c = fixture.cases[0];
    expect(
      digestOf({ ...c, result: { ...c.result, keyperIndices: [1, 3] } })
    ).not.toBe(c.digest);
  });

  it('binds the recovery bound', () => {
    const c = fixture.cases[0];
    expect(
      digestOf({ ...c, result: { ...c.result, bsgsBound: 1001 } })
    ).not.toBe(c.digest);
  });

  it('rejects a negative total rather than digesting it', () => {
    const c = fixture.cases[0];
    expect(() =>
      resultDigest({ electionId: c.electionId, ...c.result, totals: [-1] })
    ).toThrow(GegDigestError);
  });
});

describe('parseJsonPreservingBigInts', () => {
  it('keeps an integer that JSON.parse would round', () => {
    const raw = '{"totals":[9007199254740993,1]}';
    expect(JSON.parse(raw).totals[0]).toBe(9007199254740992); // the bug
    expect(parseJsonPreservingBigInts(raw).totals[0]).toBe('9007199254740993');
  });

  it('leaves ordinary numbers alone', () => {
    expect(parseJsonPreservingBigInts('{"a":42,"b":[1,2]}')).toEqual({
      a: 42,
      b: [1, 2]
    });
  });

  // Every byte field in these payloads is a quoted hex string, and some are long
  // runs of digits. Quoting inside a string would corrupt them.
  it('does not touch digits inside strings', () => {
    const raw = '{"sig":"0x1111111111111111111111","n":11111111111111111111}';
    const out = parseJsonPreservingBigInts(raw);
    expect(out.sig).toBe('0x1111111111111111111111');
    expect(out.n).toBe('11111111111111111111');
  });
});
