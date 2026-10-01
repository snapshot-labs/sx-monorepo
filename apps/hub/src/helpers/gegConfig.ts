/**
 * Mapping a Snapshot proposal onto the threshold protocol's election config.
 *
 * The protocol treats an election's config as a frozen artifact and refuses to
 * decode one whose fields are the wrong shape — a single wrong enum value or key
 * name makes every read fail, which is why this mapping lives in exactly one
 * place. The hub is that place: it already links the crypto SDK, and it is the
 * only process that speaks the protocol's JSON.
 *
 * A config has two halves.
 *
 * **Frozen** — committee, threshold, role keys, and the voting window. The
 * sequencer writes these into `proposals.te_geg_config` at proposal creation
 * (see apps/sequencer/src/helpers/teCommittee.ts) and nothing rewrites them.
 *
 * **Derived live** — `numCandidates`, `budget`, `mode`, `variant`. These follow
 * from `choices` and `type`, which an author may edit via `update-proposal` right
 * up until voting opens, so a frozen copy would go stale. Deriving them on every
 * read is safe *because* that endpoint refuses edits once `start` has passed:
 * they are therefore constant across the entire voting window, which is the only
 * window in which they matter. Key generation does not depend on any of them, and
 * no ballot can exist before `start`.
 *
 * Field types worth not guessing at (all confirmed against the protocol's own
 * full-election vector, and all of which raise a decode error if wrong):
 *   - `duplicatePolicy` is the enum *value* `'last-wins'`, not a member name.
 *   - `protocolVersion` is the string `'SHUTTER-VOTE-v1'`, not a number.
 *   - `selfSubmitFee` is a decimal string, not a number (fees exceed 2^53).
 */

/**
 * The unit this proposal's tally counts in.
 *
 * The recovery bound is `budget × Σ(admitted weights)` and BSGS cost grows as its
 * square root, so a token with a very large supply could put a tally out of reach.
 * Dividing every weight by `s` keeps the bound inside what the coordinator can
 * solve while preserving **every ratio in the cap table** — the clamp this replaces
 * instead flattened the top of it, counting a 25,000 holder and a 25,000,000 holder
 * identically.
 *
 * The smallest power of two that fits, so no proposal loses more precision than its
 * ceiling forces. `1` — no scaling at all — is the answer for essentially every
 * real space: at the default ceiling a space needs `budget × totalSupply > 1e12`
 * before this moves off 1.
 *
 * Derived live rather than frozen, alongside `budget`, because an author may edit
 * `type` until voting opens: flipping weighted → basic changes `budget` by 100×, and
 * a stored `s` would then be 100× too small.
 */
export function deriveScale(
  budget: number,
  maxTotalWeight: number,
  solverCeiling: number
): number {
  let scale = 1;
  while (budget * Math.ceil(maxTotalWeight / scale) > solverCeiling) {
    scale *= 2;
  }
  return scale;
}

const PROTOCOL_VERSION = 'SHUTTER-VOTE-v1';

/** Committee snapshot as the sequencer froze it. */
export interface TeCommitteeSnapshot {
  v: 1;
  keypers: Array<{ address: string; url: string }>;
  thresholdT: number;
  thresholdN: number;
  eligibilityKey: string;
  resultPublisherAddress: string;
  adminAddress: string;
  votingStart: number;
  votingEnd: number;
  weightedBudget: number;
  /** Conservative bound on total voting power, frozen at creation. */
  maxTotalWeight: number;
  /** The solver ceiling this proposal was sized against, frozen at creation. */
  solverCeiling: number;
}

/** The protocol's election config, in its exact wire shape. */
export interface GegElectionConfig {
  electionId: string;
  numCandidates: number;
  budget: number;
  mode: 'exact' | 'atMost';
  variant: 'A' | 'B';
  weighted: boolean;
  /** Divisor applied to every weight at aggregation; 1 means no scaling. */
  scale: number;
  duplicatePolicy: 'first-wins' | 'last-wins';
  votingStart: number;
  votingEnd: number;
  threshold: { t: number; n: number };
  keypers: Array<{ signingKey: string; url: string }>;
  eligibilityKey: string;
  resultPublisherKey: string;
  gatewayKeys: string[];
  adminKey: string;
  protocolVersion: string;
  selfSubmitFee: string;
}

export class GegConfigError extends Error {}

/**
 * The per-proposal ballot parameters, derived from mutable proposal fields.
 *
 * Weighted proposals encode proportional splits as integers summing to
 * `weightedBudget` (60 + 40 = 100); single-choice uses a budget of 1 and the
 * split degenerates to a unit vector. `mode: 'exact'` and `variant: 'A'` are the
 * only combination this deployment supports.
 */
function deriveBallotParams(
  choices: string[],
  type: string | null | undefined,
  weightedBudget: number
): { numCandidates: number; budget: number; mode: 'exact'; variant: 'A' } {
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new GegConfigError('proposal has no choices');
  }
  return {
    numCandidates: choices.length,
    budget: type === 'weighted' ? weightedBudget : 1,
    mode: 'exact',
    variant: 'A'
  };
}

export function parseCommitteeSnapshot(raw: unknown): TeCommitteeSnapshot {
  let snapshot: any = raw;
  if (typeof raw === 'string') {
    try {
      snapshot = JSON.parse(raw);
    } catch {
      throw new GegConfigError('te_geg_config is not valid JSON');
    }
  }
  if (!snapshot || typeof snapshot !== 'object') {
    throw new GegConfigError('proposal has no committee snapshot');
  }
  if (snapshot.v !== 1) {
    throw new GegConfigError(
      `unsupported committee snapshot version ${snapshot.v}`
    );
  }
  if (!Array.isArray(snapshot.keypers) || snapshot.keypers.length === 0) {
    throw new GegConfigError('committee snapshot has no keypers');
  }
  if (snapshot.keypers.length !== snapshot.thresholdN) {
    throw new GegConfigError(
      `committee snapshot lists ${snapshot.keypers.length} keypers but n = ${snapshot.thresholdN}`
    );
  }
  return snapshot as TeCommitteeSnapshot;
}

/**
 * Compose the wire config for one proposal.
 *
 * `currentEligibilityKey`, when supplied, is asserted against the frozen one. A
 * rotated eligibility key would otherwise invalidate every credential on older
 * proposals — excluding every ballot and producing a tally of zeros with nothing
 * to explain it — so this fails loudly instead.
 */
export function composeElectionConfig(args: {
  proposalId: string;
  choices: string[];
  type: string | null | undefined;
  snapshot: TeCommitteeSnapshot;
  currentEligibilityKey?: string;
}): GegElectionConfig {
  const { proposalId, choices, type, snapshot } = args;

  if (
    args.currentEligibilityKey &&
    args.currentEligibilityKey.toLowerCase() !==
      snapshot.eligibilityKey.toLowerCase()
  ) {
    throw new GegConfigError(
      'frozen eligibility key does not match the hub key in use; ' +
        'the key was rotated and credentials on this proposal can no longer verify'
    );
  }

  const params = deriveBallotParams(choices, type, snapshot.weightedBudget);

  return {
    electionId: proposalId,
    ...params,
    weighted: true,
    // Derived here, not read from the snapshot: `budget` is itself derived live from
    // the proposal's editable `type`, and `s` has to follow it (see `deriveScale`).
    scale: deriveScale(
      params.budget,
      snapshot.maxTotalWeight,
      snapshot.solverCeiling
    ),
    duplicatePolicy: 'last-wins',
    votingStart: snapshot.votingStart,
    votingEnd: snapshot.votingEnd,
    // `t` is the quorum — the number of keypers required, not the number of
    // faults tolerated — and it means the same thing on both sides of this
    // boundary, so it passes through unconverted. Keeping one meaning is the
    // point: a compensating +1 here is exactly how the field came to mean two
    // different things in the first place.
    threshold: { t: snapshot.thresholdT, n: snapshot.thresholdN },
    // The protocol calls a keyper's write-authorisation identity its signing
    // key; for this backend that is the member's Ethereum address.
    keypers: snapshot.keypers.map(k => ({
      signingKey: k.address.toLowerCase(),
      url: k.url
    })),
    eligibilityKey: snapshot.eligibilityKey.toLowerCase(),
    resultPublisherKey: snapshot.resultPublisherAddress.toLowerCase(),
    // Empty means ballot writes are unauthenticated at the data layer. Correct
    // here: ballots arrive through the sequencer's own signed-message pipeline,
    // never through this API.
    gatewayKeys: [],
    adminKey: snapshot.adminAddress.toLowerCase(),
    protocolVersion: PROTOCOL_VERSION,
    selfSubmitFee: '0'
  };
}
