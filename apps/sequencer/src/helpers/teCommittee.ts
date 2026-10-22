/**
 * The threshold committee config frozen onto a private proposal when it is
 * created, stored in `proposals.te_sgp_config` and never changed afterwards.
 *
 * It is frozen because the committee comes from env (`TE_KEYPERS`,
 * `TE_THRESHOLD_T`); changing env must not alter proposals whose key generation
 * already ran against the old committee.
 *
 * `numCandidates`, `budget`, `mode` and `variant` are not stored here: they come
 * from `choices` and `type`, which the author can edit until `start`, so the hub
 * derives them on each read.
 *
 * This is sx's own shape, not the protocol's JSON format. The hub converts it in
 * `apps/hub/src/helpers/sgpConfig.ts`, so the wire format is defined in one place.
 */

import snapshot from '@snapshot-labs/snapshot.js';
import fetch from 'node-fetch';
import log from './log';

/**
 * EIP-55 checksum of an already-validated address; the hub compares committee
 * addresses against `getAddress()` output. Lowercased first, so a mixed-case
 * address with a wrong checksum is re-checksummed rather than rejected.
 */
function toChecksumAddress(address: string): string {
  return snapshot.utils.getFormattedAddress(address.toLowerCase(), 'evm');
}

/** One committee member: the address that signs its writes, and where to reach it. */
export interface TeKeyper {
  address: string;
  url: string;
}

/** The frozen snapshot, stored verbatim as `proposals.te_sgp_config`. */
export interface TeCommitteeSnapshot {
  /** Schema version of this snapshot, so a later shape change is detectable. */
  v: 1;
  keypers: TeKeyper[];
  /** Quorum: the number of keypers that must act together (t of n). */
  thresholdT: number;
  /** Committee size. Always `keypers.length`; stored so reads need no derivation. */
  thresholdN: number;
  /**
   * Compressed G1 eligibility public key, derived at creation from the
   * sequencer's `TE_ELIGIBILITY_PRIVATE_KEY`.
   */
  eligibilityKey: string;
  /** Address allowed to publish the result and mark a tally stalled. */
  resultPublisherAddress: string;
  /** Address allowed to clear a stalled tally. */
  adminAddress: string;
  /** Voting window, mirrored from the proposal so the config is self-contained. */
  votingStart: number;
  votingEnd: number;
  /**
   * Denominator for weighted vote splits. Frozen because it is a deployment
   * choice, unlike the per-proposal `budget` the hub derives from `type`.
   */
  weightedBudget: number;
  /**
   * Upper bound on the proposal's total voting power, resolved at creation (see
   * `teVotingPowerBound.ts`). Frozen because the scale `s` is derived from it and
   * must not change once voting has started.
   */
  maxTotalWeight: number;
  /**
   * `TE_SOLVER_CEILING` at creation. Frozen so a later env change cannot change
   * the scale of a live proposal.
   */
  solverCeiling: number;
}

export class TeConfigError extends Error {}

// An encrypted tally can only sum votes per choice, which these types need and
// nothing else. Any other type is refused, including types added later.
const PRIVATE_VOTE_TYPES = ['single-choice', 'basic', 'weighted'];

// A ballot carries `choices × (budget + 1)` proof branches of about 516 bytes
// each. 2000 keeps a ballot under the sequencer's 1 MB body limit (at budget 100:
// 19 choices, ~994 KB).
const MAX_PROOF_BRANCHES = 2000;

/** Why a proposal cannot use private voting, or undefined when it can. */
export function getPrivateBallotError(
  type: string,
  numChoices: number,
  weightedBudget: number
): string | undefined {
  if (!PRIVATE_VOTE_TYPES.includes(type)) {
    return `${type} voting is not supported with private voting`;
  }
  const budget = type === 'weighted' ? weightedBudget : 1;
  if (numChoices * (budget + 1) > MAX_PROOF_BRANCHES) {
    return `private ${type} voting allows at most ${Math.floor(MAX_PROOF_BRANCHES / (budget + 1))} choices`;
  }
}

/**
 * The largest BSGS search (`budget × Σ admitted weights`) the coordinator can
 * solve. It depends on the coordinator's hardware, so it is set here, not by SGP.
 *
 * Cost is about `2√bound × 11 µs` of time and `218 B × √bound` of memory (see
 * `shutter-governance-protocol/COORDINATOR_SIZING.md`): 1e12 is about 22 s and
 * 220 MB, and quadrupling the bound doubles both. The default suits a 0.5 GB
 * coordinator. Raise it only together with memory; `recover_result` refuses a
 * bound that is too large.
 */
export const DEFAULT_TE_SOLVER_CEILING = 1e12;

export function teSolverCeiling(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TE_SOLVER_CEILING;
  if (raw === undefined || raw.trim() === '') return DEFAULT_TE_SOLVER_CEILING;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    throw new TeConfigError(
      `TE_SOLVER_CEILING must be a positive number, got ${JSON.stringify(raw)}`
    );
  }
  return value;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const G1_KEY_RE = /^0x[0-9a-fA-F]{96}$/;

/** One `TE_KEYPERS` entry: a keyper's URL, before its address is known. */
export interface TeKeyperEntry {
  url: string;
}

/**
 * Parse `TE_KEYPERS`: a comma-separated list of keyper URLs. Addresses are not
 * accepted here; `resolveCommittee` reads each keyper's address from its `/status`.
 */
export function parseKeypers(raw: string | undefined): TeKeyperEntry[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      if (entry.includes('@')) {
        throw new TeConfigError(
          `TE_KEYPERS entry "${entry}" looks like "address@url"; it takes URLs only. ` +
            `Each keyper's address is read from its /status.`
        );
      }
      const url = entry.replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(url)) {
        throw new TeConfigError(
          `TE_KEYPERS entry "${entry}" must be a http(s) URL`
        );
      }
      return { url };
    });
}

// Resolved committees, keyed by the exact `TE_KEYPERS` string.
const committeeCache = new Map<string, TeKeyper[]>();

/** Visible for tests: forget any resolved committee. */
export function clearCommitteeCache(): void {
  committeeCache.clear();
}

/**
 * Turn keyper URLs into the committee frozen onto a proposal, reading each
 * keyper's signing address from its `/status`.
 *
 * - Resolved once per process and cached by the `TE_KEYPERS` string, so it is not
 *   re-fetched on every proposal.
 * - Two URLs with the same address are refused: otherwise one operator could
 *   meet the threshold alone.
 * - An unreachable keyper is an error, because key generation needs every member.
 *   Errors name the URL.
 */
export async function resolveCommittee(
  entries: TeKeyperEntry[],
  raw: string,
  timeoutMs = 5000
): Promise<TeKeyper[]> {
  const cached = committeeCache.get(raw);
  if (cached) return cached;

  const resolved = await Promise.all(
    entries.map(async entry => {
      let reported: string;
      try {
        const res = await fetch(`${entry.url}/status`, {
          timeout: timeoutMs
        } as any);
        if (!res.ok) {
          throw new Error(`/status returned HTTP ${res.status}`);
        }
        const body: any = await res.json();
        const hex = String(body?.address ?? '')
          .toLowerCase()
          .replace(/^0x/, '');
        if (!/^[0-9a-f]{40}$/.test(hex)) {
          throw new Error('/status did not return a valid address');
        }
        reported = toChecksumAddress(`0x${hex}`);
      } catch (err: any) {
        throw new TeConfigError(
          `cannot resolve keyper at ${entry.url}: ${err?.message || err}. ` +
            `Is it running and reachable from this container?`
        );
      }

      return { address: reported, url: entry.url };
    })
  );

  const byAddress = new Map<string, string>();
  for (const k of resolved) {
    const seen = byAddress.get(k.address.toLowerCase());
    if (seen) {
      throw new TeConfigError(
        `${seen} and ${k.url} are the same keyper (${k.address}). ` +
          `Each committee member must be a distinct key, or the threshold is not what it looks like.`
      );
    }
    byAddress.set(k.address.toLowerCase(), k.url);
  }

  committeeCache.set(raw, resolved);
  log.info(
    `[te] committee resolved: ${resolved.map(k => `${k.address}@${k.url}`).join(', ')}`
  );
  return resolved;
}

export interface TeEnv {
  keypers: string | undefined;
  thresholdT: string | undefined;
  weightedBudget: string | undefined;
  resultPublisherAddress: string | undefined;
}

export function readTeEnv(env: NodeJS.ProcessEnv = process.env): TeEnv {
  return {
    keypers: env.TE_KEYPERS,
    thresholdT: env.TE_THRESHOLD_T,
    weightedBudget: env.TE_WEIGHTED_BUDGET,
    resultPublisherAddress: env.TE_RESULT_PUBLISHER_ADDRESS
  };
}

function requireAddress(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new TeConfigError(`${name} is required`);
  const v = value.trim();
  if (!ADDRESS_RE.test(v)) throw new TeConfigError(`${name} is not an address`);
  return toChecksumAddress(v);
}

function requireInt(
  value: string | undefined,
  name: string,
  fallback?: number
): number {
  if (value === undefined || value.trim() === '') {
    if (fallback !== undefined) return fallback;
    throw new TeConfigError(`${name} is required`);
  }
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new TeConfigError(`${name} must be an integer`);
  }
  return n;
}

/**
 * Build the snapshot for one proposal. The checks mirror the protocol's own config
 * rules, so a bad committee is rejected at creation with a readable error instead
 * of failing later during key generation.
 */
export async function buildCommitteeSnapshot(args: {
  env?: TeEnv;
  eligibilityKey: string;
  votingStart: number;
  votingEnd: number;
  adminAddress: string;
  /** Resolved by `resolveVotingPowerBound` at creation; see `maxTotalWeight`. */
  maxTotalWeight: number;
  /** Defaults to `TE_SOLVER_CEILING`; passed explicitly only by tests. */
  solverCeiling?: number;
}): Promise<TeCommitteeSnapshot> {
  const env = args.env ?? readTeEnv();

  const entries = parseKeypers(env.keypers);
  if (entries.length === 0) {
    throw new TeConfigError(
      'TE_KEYPERS is not configured; this deployment cannot host private proposals'
    );
  }

  const keypers = await resolveCommittee(entries, env.keypers ?? '');

  const thresholdN = keypers.length;
  const thresholdT = requireInt(env.thresholdT, 'TE_THRESHOLD_T', 2);
  // `TE_THRESHOLD_T` is the quorum: a 2-of-3 committee is t = 2, n = 3.
  if (thresholdT < 1 || thresholdT > thresholdN) {
    throw new TeConfigError(
      `TE_THRESHOLD_T (${thresholdT}) must satisfy 1 <= t <= n, with n = ${thresholdN} ` +
        `(t is the quorum: t of n keypers act together)`
    );
  }

  if (thresholdT * 2 <= thresholdN) {
    throw new TeConfigError(
      `TE_THRESHOLD_T (${thresholdT}) is not a majority of n = ${thresholdN} — ` +
        `use t >= ${Math.floor(thresholdN / 2) + 1}. Two disjoint groups of ` +
        `${thresholdT} fit in a committee of ${thresholdN}, so they could each ` +
        `claim the same quorum`
    );
  }

  const weightedBudget = requireInt(
    env.weightedBudget,
    'TE_WEIGHTED_BUDGET',
    100
  );
  if (weightedBudget < 1) {
    throw new TeConfigError('TE_WEIGHTED_BUDGET must be >= 1');
  }

  if (!G1_KEY_RE.test(args.eligibilityKey)) {
    throw new TeConfigError(
      'eligibility key must be a 0x-prefixed 48-byte compressed G1 point'
    );
  }

  if (!(args.votingEnd > args.votingStart)) {
    throw new TeConfigError(
      `votingEnd (${args.votingEnd}) must be after votingStart (${args.votingStart})`
    );
  }

  return {
    v: 1,
    keypers,
    thresholdT,
    thresholdN,
    eligibilityKey: args.eligibilityKey.toLowerCase(),
    resultPublisherAddress: requireAddress(
      env.resultPublisherAddress,
      'TE_RESULT_PUBLISHER_ADDRESS'
    ),
    adminAddress: args.adminAddress,
    votingStart: args.votingStart,
    votingEnd: args.votingEnd,
    weightedBudget,
    maxTotalWeight: args.maxTotalWeight,
    solverCeiling: args.solverCeiling ?? teSolverCeiling()
  };
}

/**
 * Parse a stored snapshot without validating it; returns null if it is missing or
 * malformed. Used by `ballotParamsColumn`, which then falls back to `scale: 1`.
 */
export function parseCommitteeSnapshotLoose(teSgpConfig: unknown): {
  maxTotalWeight?: number;
  solverCeiling?: number;
  eligibilityKey?: string;
} | null {
  try {
    const snapshot =
      typeof teSgpConfig === 'string'
        ? JSON.parse(teSgpConfig)
        : (teSgpConfig as any);
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
  } catch {
    return null;
  }
}

export function frozenWeightedBudget(teSgpConfig: unknown): number {
  const snapshot =
    typeof teSgpConfig === 'string'
      ? JSON.parse(teSgpConfig)
      : (teSgpConfig as any);
  const budget = Number(snapshot?.weightedBudget);
  if (!Number.isInteger(budget) || budget < 1) {
    throw new TeConfigError(
      `te_sgp_config.weightedBudget is missing or invalid (${snapshot?.weightedBudget})`
    );
  }
  return budget;
}

/** `TE_WEIGHTED_BUDGET` (default 100), for use before the snapshot exists. */
export function weightedBudgetFromEnv(): number {
  const v = Number(readTeEnv().weightedBudget ?? 100);
  return Number.isFinite(v) && v >= 1 ? v : 100;
}

/**
 * The voting power bound `V` used when no strategy provides one (unknown strategy,
 * or none). It is `floor(ceiling / budget)`: the largest total weight that can be
 * tallied without scaling. It is not an estimate of the space's real voting power.
 *
 * It is not configurable: a larger value forces scaling, which divides every
 * voter's power for no reason. To allow more, raise `TE_SOLVER_CEILING`.
 */
export function votingPowerFallback(budget: number): number {
  return Math.max(1, Math.floor(teSolverCeiling() / Math.max(1, budget)));
}

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

export function ballotParamsColumn(
  choices: string[],
  type: string | null | undefined,
  weightedBudget: number,
  snapshot?: { maxTotalWeight?: number; solverCeiling?: number } | null
): { te_config: string } {
  const budget = type === 'weighted' ? weightedBudget : 1;
  // Sent with the proposal so the UI can tell the voter, before signing, how much
  // their voting power will be scaled down.
  const scale =
    snapshot?.maxTotalWeight && snapshot?.solverCeiling
      ? deriveScale(budget, snapshot.maxTotalWeight, snapshot.solverCeiling)
      : 1;
  return {
    te_config: JSON.stringify({
      numCandidates: choices.length,
      budget,
      mode: 'exact',
      variant: 'A',
      scale
    })
  };
}

/**
 * The columns written with a private proposal. `te_sgp_config` is the source of
 * truth; the other three are copies for the UI and for the hub's write check, which
 * reads `te_keyper_addresses[keyper_index - 1]`. Regenerate them from the snapshot;
 * never edit them by hand.
 */
export function committeeColumns(snapshot: TeCommitteeSnapshot): {
  te_sgp_config: string;
  te_threshold_t: number;
  te_threshold_n: number;
  te_keyper_addresses: string;
} {
  return {
    te_sgp_config: JSON.stringify(snapshot),
    te_threshold_t: snapshot.thresholdT,
    te_threshold_n: snapshot.thresholdN,
    te_keyper_addresses: JSON.stringify(snapshot.keypers.map(k => k.address))
  };
}
