/**
 * Builds the threshold protocol's election config from a Snapshot proposal. The
 * protocol fails to decode a config with any wrongly shaped field, so this is the
 * only place that builds it.
 *
 * Frozen fields (committee, threshold, role keys, voting window) are written by
 * the sequencer into `proposals.te_sgp_config` at creation (see
 * apps/sequencer/src/helpers/teCommittee.ts).
 *
 * `numCandidates`, `budget`, `mode`, `variant` and `scale` come from
 * `proposals.te_config`, which the sequencer rewrites on every create and edit and
 * checks every ballot against, so the committee counts with the same values.
 * `update-proposal` refuses edits after `start`, so they are fixed while voting.
 *
 * Exact field types (a wrong one is a decode error):
 *   - `duplicatePolicy` is the enum value `'last-wins'`, not a member name.
 *   - `protocolVersion` is the string `'SHUTTER-VOTE-v1'`.
 *   - `selfSubmitFee` is a decimal string (fees can exceed 2^53).
 */

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

/** The ballot parameters from `te_config`. Only `exact` with variant `A` exists. */
function ballotParams(ballot: any): {
  numCandidates: number;
  budget: number;
  mode: 'exact';
  variant: 'A';
  scale: number;
} {
  const isPositiveInt = (v: unknown) => Number.isInteger(v) && Number(v) >= 1;
  if (
    !isPositiveInt(ballot?.numCandidates) ||
    !isPositiveInt(ballot?.budget) ||
    !isPositiveInt(ballot?.scale) ||
    ballot.mode !== 'exact' ||
    ballot.variant !== 'A'
  ) {
    throw new SgpConfigError('te_config is missing or incomplete');
  }
  const { numCandidates, budget, mode, variant, scale } = ballot;
  return { numCandidates, budget, mode, variant, scale };
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
 * It carries the frozen eligibility key, not the current one: after a rotation the
 * sequencer accepts no more votes on the proposal, and every ballot already cast
 * still verifies against the frozen key, so the proposal is tallied as usual.
 */
export function composeElectionConfig(args: {
  proposalId: string;
  ballot: unknown;
  snapshot: TeCommitteeSnapshot;
}): SgpElectionConfig {
  const { proposalId, snapshot } = args;
  const { scale, ...params } = ballotParams(args.ballot);

  return {
    electionId: proposalId,
    ...params,
    weighted: true,
    scale,
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
