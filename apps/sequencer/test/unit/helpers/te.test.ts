import {
  expectedPseudonym,
  isDustVotingPower,
  isWithinSgpVotingWindow,
  verifyTeBallot
} from '../../../src/helpers/te';

/** Any well-formed issuer key; these cases fail before it is used. */
const ELIG_KEY = `0x${'ab'.repeat(48)}`;
const VOTER = '0x1111111111111111111111111111111111111111';
const PROPOSAL_ID = `0x${'22'.repeat(32)}`;

describe('helpers/te', () => {
  // The UI derives the same pseudonym and asserts the same constant. If the two
  // disagree, every private ballot is rejected as pseudonym_mismatch.
  test('expectedPseudonym matches the fixed vector', () => {
    expect(expectedPseudonym(VOTER, PROPOSAL_ID)).toBe(
      '0x2bc0e4453d022b3e9e099d968a3291ad16b616abdb07af6b9d3b771b8b35da13'
    );
  });

  describe('verifyTeBallot — structural rejections', () => {
    const proposal = {
      id: PROPOSAL_ID,
      te_config: {
        numCandidates: 2,
        budget: 1,
        mode: 'exact' as const,
        variant: 'A' as const
      },
      te_mpk: `0x${'ab'.repeat(96)}`
    };
    const wrongPseudonym = `0x${'00'.repeat(32)}`;

    // A missing credential gets its own reason, instead of showing up later as a
    // confusing signature failure. With a credential present, a wrong pseudonym
    // (not keccak256(voter || proposalId)) fails on its own check.
    test.each([
      [
        'te_config missing',
        { te_config: null },
        '{}',
        'proposal_missing_te_config'
      ],
      [
        'DKG not finalised',
        { te_mpk: null },
        '{}',
        'proposal_dkg_not_finalized'
      ],
      ['malformed JSON', {}, 'not json', 'choice_not_json_envelope'],
      ...[undefined, null, 'not an object'].map(attestation => [
        `no credential (${attestation})`,
        {},
        JSON.stringify({ pseudonym: wrongPseudonym, attestation }),
        'ballot_carries_no_credential'
      ]),
      [
        'pseudonym mismatch',
        {},
        JSON.stringify({
          electionId: `0x${'11'.repeat(32)}`,
          pseudonym: wrongPseudonym,
          vk: `0x${'00'.repeat(48)}`,
          ciphertexts: [],
          zkProof: '0x',
          voterSignature: `0x${'00'.repeat(80)}`,
          attestation: { weight: 1, nonce: 1 }
        }),
        'pseudonym_mismatch'
      ]
    ] as [string, object, string, string][])(
      'rejects: %s',
      async (_label, override, choice, reason) => {
        const r = await verifyTeBallot(
          { ...proposal, ...override },
          VOTER,
          choice,
          ELIG_KEY
        );
        expect(r).toEqual({ ok: false, reason });
      }
    );
  });

  // 0.5 rounds up and counts; anything below rounds to zero and the hub's feed
  // would drop it. Non-finite values must count as dust too: `NaN < 1` is false,
  // and the hub's `BigInt(Math.round(vp))` would then break the whole feed.
  test.each([
    [0.49999, true],
    [0.5, false],
    [0.500001, false],
    [1, false],
    [1e6, false],
    [NaN, true],
    [Infinity, true],
    [-Infinity, true]
  ])('isDustVotingPower(%p) is %p', (vp, dust) => {
    expect(isDustVotingPower(vp as number)).toBe(dust);
  });

  // Snapshot accepts a vote timestamped exactly at `end`, SGP does not. Private
  // voting follows SGP's half-open `is_voting_open`.
  test.each([
    [999, false],
    [1_000, true],
    [1_001, true],
    [1_999, true],
    [2_000, false],
    [2_001, false]
  ])('isWithinSgpVotingWindow(t=%p) is %p', (t, expected) => {
    expect(isWithinSgpVotingWindow(t as number, 1_000, 2_000)).toBe(expected);
  });
});
