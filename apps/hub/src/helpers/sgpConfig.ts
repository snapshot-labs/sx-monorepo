/**
 * Builds the threshold protocol's election config from a Snapshot proposal. The
 * protocol fails to decode a config with any wrongly shaped field, so this is the
 * only place that builds it.
 *
 * Frozen fields (committee, threshold, role keys, voting window) are written by
 * the sequencer into `proposals.te_sgp_config` at creation (see
 * apps/sequencer/src/helpers/teCommittee.ts).
 *
 * `numCandidates`, `budget`, `mode`, `variant` and `scale` are derived on every
 * read from `choices` and `type`, which the author can edit until voting starts.
 * `update-proposal` refuses edits after `start`, so they are fixed while voting.
 *
 * Exact field types (a wrong one is a decode error):
 *   - `duplicatePolicy` is the enum value `'last-wins'`, not a member name.
 *   - `protocolVersion` is the string `'SHUTTER-VOTE-v1'`.
 *   - `selfSubmitFee` is a decimal string (fees can exceed 2^53).
 */

/**
 * The divisor applied to every weight so the tally stays solvable.
 *
 * The tally bound is `budget × Σ(admitted weights)`, and BSGS cost grows with its
 * square root. Dividing all weights by the same scale keeps the bound under
 * `solverCeiling` and keeps every voter's share in proportion. Returns the
 * smallest power of two that fits; usually 1 (no scaling).
 *
 * Derived on read, like `budget`, because `type` can be edited until voting starts.
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
export interface SgpElectionConfig {
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

export class SgpConfigError extends Error {}

/**
 * Ballot parameters derived from the editable proposal fields.
 *
 * Weighted proposals encode a split as integers summing to `weightedBudget`
 * (60 + 40 = 100); other types use a budget of 1. Only `mode: 'exact'` with
 * `variant: 'A'` is supported.
 */
function deriveBallotParams(
  choices: string[],
  type: string | null | undefined,
  weightedBudget: number
): { numCandidates: number; budget: number; mode: 'exact'; variant: 'A' } {
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new SgpConfigError('proposal has no choices');
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
      throw new SgpConfigError('te_sgp_config is not valid JSON');
    }
  }
  if (!snapshot || typeof snapshot !== 'object') {
    throw new SgpConfigError('proposal has no committee snapshot');
  }
  if (snapshot.v !== 1) {
    throw new SgpConfigError(
      `unsupported committee snapshot version ${snapshot.v}`
    );
  }
  if (!Array.isArray(snapshot.keypers) || snapshot.keypers.length === 0) {
    throw new SgpConfigError('committee snapshot has no keypers');
  }
  if (snapshot.keypers.length !== snapshot.thresholdN) {
    throw new SgpConfigError(
      `committee snapshot lists ${snapshot.keypers.length} keypers but n = ${snapshot.thresholdN}`
    );
  }
  return snapshot as TeCommitteeSnapshot;
}

/**
 * Builds the wire config for one proposal.
 *
 * If `currentEligibilityKey` is given it must equal the frozen key. After a key
 * rotation every credential on the proposal would fail and the tally would be all
 * zeros, so this throws instead.
 */
export function composeElectionConfig(args: {
  proposalId: string;
  choices: string[];
  type: string | null | undefined;
  snapshot: TeCommitteeSnapshot;
  currentEligibilityKey?: string;
}): SgpElectionConfig {
  const { proposalId, choices, type, snapshot } = args;

  if (
    args.currentEligibilityKey &&
    args.currentEligibilityKey.toLowerCase() !==
      snapshot.eligibilityKey.toLowerCase()
  ) {
    throw new SgpConfigError(
      'frozen eligibility key does not match the hub key in use; ' +
        'the key was rotated and credentials on this proposal can no longer verify'
    );
  }

  const params = deriveBallotParams(choices, type, snapshot.weightedBudget);

  return {
    electionId: proposalId,
    ...params,
    weighted: true,
    // Not frozen: it depends on `budget`, which follows the editable `type`.
    scale: deriveScale(
      params.budget,
      snapshot.maxTotalWeight,
      snapshot.solverCeiling
    ),
    duplicatePolicy: 'last-wins',
    votingStart: snapshot.votingStart,
    votingEnd: snapshot.votingEnd,
    // `t` is the number of keypers required (not faults tolerated) on both sides,
    // so it is passed through unchanged.
    threshold: { t: snapshot.thresholdT, n: snapshot.thresholdN },
    // A keyper's signing key is its Ethereum address here.
    keypers: snapshot.keypers.map(k => ({
      signingKey: k.address.toLowerCase(),
      url: k.url
    })),
    eligibilityKey: snapshot.eligibilityKey.toLowerCase(),
    resultPublisherKey: snapshot.resultPublisherAddress.toLowerCase(),
    // Empty: the data layer does not authenticate ballot writes, because ballots
    // only arrive through the sequencer's signed-message pipeline.
    gatewayKeys: [],
    adminKey: snapshot.adminAddress.toLowerCase(),
    protocolVersion: PROTOCOL_VERSION,
    selfSubmitFee: '0'
  };
}
