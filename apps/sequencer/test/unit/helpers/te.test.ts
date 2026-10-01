import {
  expectedPseudonym,
  isDustVotingPower,
  isWithinGegVotingWindow,
  verifyTeBallot
} from '../../../src/helpers/te';

/** Any well-formed issuer key; these cases fail before it is used. */
const ELIG_KEY = `0x${'ab'.repeat(48)}`;

describe('helpers/te', () => {
  describe('expectedPseudonym', () => {
    test('is deterministic for fixed inputs', () => {
      const a = expectedPseudonym(
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222'
      );
      const b = expectedPseudonym(
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222'
      );
      expect(a).toBe(b);
      expect(a).toMatch(/^0x[0-9a-f]{64}$/);
    });

    test('changes with the proposal id', () => {
      const a = expectedPseudonym(
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222'
      );
      const b = expectedPseudonym(
        '0x1111111111111111111111111111111111111111',
        '0x3333333333333333333333333333333333333333333333333333333333333333'
      );
      expect(a).not.toBe(b);
    });
  });

  describe('verifyTeBallot — structural rejections', () => {
    const proposal = {
      id: '0x2222222222222222222222222222222222222222222222222222222222222222',
      te_config: {
        numCandidates: 2,
        budget: 1,
        mode: 'exact' as const,
        variant: 'A' as const
      },
      te_mpk: `0x${'ab'.repeat(96)}`
    };

    test('rejects when te_config missing', async () => {
      const r = await verifyTeBallot(
        { ...proposal, te_config: null },
        '0x1111111111111111111111111111111111111111',
        '{}',
        ELIG_KEY
      );
      expect(r).toEqual({ ok: false, reason: 'proposal_missing_te_config' });
    });

    test('rejects when DKG not finalised', async () => {
      const r = await verifyTeBallot(
        { ...proposal, te_mpk: null },
        '0x1111111111111111111111111111111111111111',
        '{}',
        ELIG_KEY
      );
      expect(r).toEqual({ ok: false, reason: 'proposal_dkg_not_finalized' });
    });

    test('rejects malformed JSON envelope', async () => {
      const r = await verifyTeBallot(
        proposal,
        '0x1111111111111111111111111111111111111111',
        'not json',
        ELIG_KEY
      );
      expect(r).toEqual({ ok: false, reason: 'choice_not_json_envelope' });
    });

    // Replaces the old `wrAttestation` guard. That field was an empty placeholder
    // and the check refused a populated one; the credential now lives in the ballot
    // and is required. Named explicitly because a missing credential would otherwise
    // surface as a signature failure, which points at the wrong thing.
    test.each([[undefined], [null], ['not an object']])(
      'rejects a ballot carrying no credential (%s)',
      async attestation => {
        const r = await verifyTeBallot(
          proposal,
          '0x1111111111111111111111111111111111111111',
          JSON.stringify({ pseudonym: `0x${'00'.repeat(32)}`, attestation }),
          ELIG_KEY
        );
        expect(r).toEqual({
          ok: false,
          reason: 'ballot_carries_no_credential'
        });
      }
    );

    // A credential present but the pseudonym wrong: falls through to the next gate,
    // proving the credential guard let it past.
    test('a present credential falls through to the pseudonym check', async () => {
      const r = await verifyTeBallot(
        proposal,
        '0x1111111111111111111111111111111111111111',
        JSON.stringify({
          pseudonym: `0x${'00'.repeat(32)}`,
          attestation: { weight: 1, nonce: 1 }
        }),
        ELIG_KEY
      );
      expect(r).toEqual({ ok: false, reason: 'pseudonym_mismatch' });
    });

    test('rejects pseudonym mismatch', async () => {
      const envelope = {
        electionId: `0x${'11'.repeat(32)}`,
        // Wrong pseudonym — does not equal keccak256(voter || proposalId).
        pseudonym: `0x${'00'.repeat(32)}`,
        vk: `0x${'00'.repeat(48)}`,
        ciphertexts: [],
        zkProof: '0x',
        voterSignature: `0x${'00'.repeat(80)}`,
        attestation: { weight: 1, nonce: 1 }
      };
      const r = await verifyTeBallot(
        proposal,
        '0x1111111111111111111111111111111111111111',
        JSON.stringify(envelope),
        ELIG_KEY
      );
      expect(r).toEqual({ ok: false, reason: 'pseudonym_mismatch' });
    });
  });
  describe('isDustVotingPower', () => {
    // The boundary is the whole point: 0.5 rounds up and counts, anything below
    // rounds to zero and would be dropped by the hub's feed.
    test.each([
      [0.49999, true],
      [0.5, false],
      [0.500001, false],
      [1, false],
      [1e6, false]
    ])('vp %p is dust: %p', (vp, dust) => {
      expect(isDustVotingPower(vp as number)).toBe(dust);
    });

    // A ballot only counts if this predicate and the hub's `Math.round(vp) < 1`
    // agree on every value. They are two copies of one rule in two services, so
    // the parity is asserted rather than assumed — a drift here means votes go
    // silently uncounted, the exact failure the check exists to prevent.
    test('agrees with the hub feed rounding across the range', () => {
      const samples = [
        0.1,
        0.4,
        0.49,
        0.5,
        0.51,
        0.9,
        1,
        1.4,
        1.5,
        2.5,
        99.49,
        1e5,
        1e6 + 1
      ];
      for (const vp of samples) {
        expect(isDustVotingPower(vp)).toBe(Math.round(vp) < 1);
      }
    });

    // Without the finite guard these all report *countable*: `Math.round(NaN)`
    // is NaN and `NaN < 1` is false, and `Infinity < 1` is false too. Both would
    // then reach the hub's `BigInt(Math.round(vp))`, where NaN and Infinity throw
    // a RangeError and take down the whole ballot feed rather than one vote.
    test.each([[NaN], [Infinity], [-Infinity]])(
      'treats non-finite vp %p as dust',
      vp => {
        expect(isDustVotingPower(vp)).toBe(true);
      }
    );
  });
  describe('isWithinGegVotingWindow', () => {
    const START = 1_000;
    const END = 2_000;

    // The end boundary is the whole reason this exists: Snapshot accepts a vote
    // timestamped exactly at `end`, geg excludes it. Private voting takes geg's.
    test.each([
      [START - 1, false],
      [START, true],
      [START + 1, true],
      [END - 1, true],
      [END, false],
      [END + 1, false]
    ])('t=%p within window: %p', (t, expected) => {
      expect(isWithinGegVotingWindow(t as number, START, END)).toBe(expected);
    });

    // Parity with the protocol's `is_voting_open`, asserted rather than assumed:
    // a drift makes an honest tally report as unverified, because the committee
    // would exclude a ballot the verify panel still counts.
    test('matches the protocol half-open predicate across the range', () => {
      for (let t = START - 2; t <= END + 2; t++) {
        expect(isWithinGegVotingWindow(t, START, END)).toBe(
          START <= t && t < END
        );
      }
    });
  });
});
