/**
 * `te_dkg_status` is derived on read, never stored.
 *
 * The column exists and used to be written by the in-repo auto-DKG service, deleted
 * in the geg migration. The protocol's coordinator knows an election's key ceremony
 * failed — it logs exactly that — but keeps the fact in its own memory and has no
 * route to report it. So for a while nothing wrote the column, the UI's two
 * "DKG failed" notices could not fire, and a permanently dead proposal presented a
 * working vote button followed by "Finalizing results" forever.
 *
 * Deriving beats adding a write path, because this is not a fact the coordinator
 * owns. It follows from two things the hub already holds: a private proposal with no
 * master public key whose voting window has opened. The key must exist *before*
 * voting opens or no ceremony can produce one matching the ballots — the same
 * condition geg's own `derive_state` uses, and the reason the state is terminal
 * rather than merely late.
 *
 * These cases are the whole contract. The dangerous direction is a false negative:
 * un-flagging a dead proposal returns it to the silent limbo above, so the
 * `now > start` boundary is pinned explicitly rather than left to a spot check.
 */

import { formatProposal } from '../../src/graphql/helpers';

const NOW = Math.floor(Date.now() / 1e3);

/** The columns `formatProposal` needs; only the four that matter here vary. */
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
    te_keyper_urls: null,
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

  // Still inside its lead time: the committee may yet finish. Flagging here would
  // declare healthy proposals dead for the whole window before they open.
  it('says nothing while the proposal has not started', () => {
    expect(
      formatProposal(proposal({ start: NOW + 600 })).te_dkg_status
    ).toBeNull();
  });

  it('says nothing once a key exists', () => {
    expect(
      formatProposal(proposal({ te_mpk: Buffer.alloc(96, 1) })).te_dkg_status
    ).toBeNull();
  });

  // The gate that keeps this off the public path entirely (D14). A public proposal
  // never has a key, so without it every closed public proposal reads as failed.
  it.each([['none'], [''], ['shutter']])(
    'says nothing for privacy=%p, which never has a key',
    privacy => {
      expect(formatProposal(proposal({ privacy })).te_dkg_status).toBeNull();
    }
  );

  // A stored value wins, so a future writer with a more specific diagnosis is not
  // flattened into the generic "no key in time".
  it('prefers a stored status over the derived one', () => {
    expect(
      formatProposal(proposal({ te_dkg_status: 'halted_complaint' }))
        .te_dkg_status
    ).toBe('halted_complaint');
  });

  // The boundary itself. `start` is the instant voting opens: at or before it the
  // ceremony still has time, after it the outcome is fixed.
  it('turns over at start, not before', () => {
    expect(
      formatProposal(proposal({ start: NOW + 1 })).te_dkg_status
    ).toBeNull();
    expect(formatProposal(proposal({ start: NOW - 1 })).te_dkg_status).toBe(
      'dkg_failed'
    );
  });
});
