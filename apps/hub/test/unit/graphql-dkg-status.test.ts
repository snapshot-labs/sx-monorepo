/**
 * `te_dkg_status` is computed when read, not stored.
 *
 * A private proposal is `dkg_failed` when voting has started (`now > start`) and
 * it still has no master public key. The key must exist before voting opens, so
 * this state is final. This is the same rule as SGP's `derive_state`.
 */

import { formatProposal } from '../../src/graphql/helpers';

// Time is frozen, so the start boundary cannot move while the tests run.
const NOW = 1_700_000_000;

beforeAll(() => {
  jest.useFakeTimers({ now: NOW * 1e3 });
});

afterAll(() => {
  jest.useRealTimers();
});

/** The columns `formatProposal` needs. */
function proposal(overrides: Record<string, any> = {}) {
  return {
    id: '0xdkg',
    space: 'test.eth',
    strategies: '[]',
    plugins: '{}',
    validation: '{}',
    voting: '{}',
    choices: '[]',
    scores: '[]',
    scores_by_strategy: '[]',
    vp_value_by_strategy: '[]',
    privacy: 'shutter-elgamal',
    te_mpk: null,
    te_config: null,
    te_committee_pks: null,
    te_keyper_addresses: null,
    te_aggregate: null,
    te_dkg_status: null,
    start: NOW - 60,
    end: NOW + 60,
    flagged: 0,
    ...overrides
  };
}

describe('derived te_dkg_status', () => {
  it('reports a private proposal whose voting opened with no key', () => {
    expect(formatProposal(proposal()).te_dkg_status).toBe('dkg_failed');
  });

  it('says nothing once a key exists', () => {
    expect(
      formatProposal(proposal({ te_mpk: Buffer.alloc(96, 1) })).te_dkg_status
    ).toBeNull();
  });

  // Only shutter-elgamal proposals ever have a key.
  it('says nothing for a proposal that is not private', () => {
    for (const privacy of ['none', '', 'shutter']) {
      expect(formatProposal(proposal({ privacy })).te_dkg_status).toBeNull();
    }
  });

  // `start` is when voting opens; the status flips only after it. Before start,
  // the committee may still finish the key ceremony.
  it('turns over at start, not before', () => {
    expect(
      formatProposal(proposal({ start: NOW + 1 })).te_dkg_status
    ).toBeNull();
    expect(formatProposal(proposal({ start: NOW })).te_dkg_status).toBeNull();
    expect(formatProposal(proposal({ start: NOW - 1 })).te_dkg_status).toBe(
      'dkg_failed'
    );
  });
});
