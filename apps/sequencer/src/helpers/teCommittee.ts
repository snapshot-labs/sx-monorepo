/**
 * The threshold committee snapshot frozen onto a private proposal at creation.
 *
 * Proposal creation is the registration event for the threshold protocol — the
 * one moment a proposal's committee, threshold, and role keys are decided — so
 * this is the single config write in sx. Everything downstream reads
 * `proposals.te_geg_config` and never mutates it.
 *
 * Freezing matters because the committee is configured fleet-wide in env. Without
 * a per-proposal snapshot, changing `TE_KEYPERS` or `TE_THRESHOLD_T` would
 * retroactively rewrite the config of proposals that had already run their key
 * generation against the *old* committee — and a keyper resolves its own index by
 * matching its signing key against that list, so the tally would break with no
 * obvious cause.
 *
 * What is deliberately **not** here: `numCandidates`, `budget`, `mode`, and
 * `variant`. Those derive from `choices` and `type`, which `update-proposal` lets
 * an author edit until `start`, so a frozen copy would go stale. The hub derives
 * them live on every read; that is safe because the same endpoint refuses edits
 * once voting opens, making them constant for the whole voting window.
 *
 * This snapshot is also deliberately **sx-shaped, not the protocol wire format**.
 * The hub is the only process that speaks the protocol's JSON (it already links
 * the crypto SDK), so it owns that mapping. Keeping wire-format knowledge in one
 * place is what stops an enum-value or key-name drift — which surfaces as every
 * read failing to decode — from being possible in two places at once. The mapping
 * itself is `apps/hub/src/helpers/gegConfig.ts`.
 */

import { keccak256 } from '@ethersproject/keccak256';
import { toUtf8Bytes } from '@ethersproject/strings';
import fetch from 'node-fetch';
import log from './log';

/**
 * EIP-55 checksum an already-validated lowercase address.
 *
 * Written out rather than pulled from `@ethersproject/address` because the
 * sequencer does not depend on that package, and one small well-understood
 * function is a better trade than a new dependency. Storing the checksummed form
 * matters: the hub's existing write-authorisation path compares committee
 * addresses against `getAddress()` output, so a lowercase copy would silently
 * fail to match.
 */
function toChecksumAddress(address: string): string {
  const lower = address.toLowerCase().slice(2);
  const hash = keccak256(toUtf8Bytes(lower)).slice(2);
  let out = '0x';
  for (let i = 0; i < lower.length; i++) {
    out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  }
  return out;
}

/** One committee member: the address that signs its writes, and where to reach it. */
export interface TeKeyper {
  address: string;
  url: string;
}

/** The frozen snapshot, stored verbatim as `proposals.te_geg_config`. */
export interface TeCommitteeSnapshot {
  /** Schema version of this snapshot, so a later shape change is detectable. */
  v: 1;
  keypers: TeKeyper[];
  /** Quorum: the number of keypers that must act together (t of n). */
  thresholdT: number;
  /** Committee size. Always `keypers.length`; stored so reads need no derivation. */
  thresholdN: number;
  /** Compressed G1 eligibility public key, fetched from the hub at creation. */
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
   * Conservative upper bound on this proposal's total voting power, resolved at
   * creation (see `teVotingPowerBound.ts`).
   *
   * Frozen rather than re-read because `s` derives from it and must not move once
   * voters can see it — and because a value that drifted between creation and tally
   * would silently change what a ballot is worth.
   */
  maxTotalWeight: number;
  /**
   * The solver ceiling this proposal was sized against, captured from
   * `TE_SOLVER_CEILING` at creation.
   *
   * Frozen so that raising the env var later cannot retroactively re-scale a live
   * proposal: the ballots were cast under the `s` this pair implies.
   */
  solverCeiling: number;
}

export class TeConfigError extends Error {}

/**
 * Ballot-shape limits the protocol enforces on an election config.
 *
 * Every keyper and auditor verifies every ballot, and a ballot's cost is
 * `numCandidates × (budget + 1)` proof branches at roughly 3 ms each. Above the
 * protocol's ceiling a proposal registers cleanly and can then never be tallied,
 * so it has to be refused at creation — the config is frozen at that moment and
 * cannot be edited afterwards.
 */
const MAX_PROOF_BRANCHES = 2500;

/**
 * Reject a proposal whose ballots would be too expensive to verify.
 *
 * Called with the *effective* candidate count and budget: a weighted proposal
 * uses `TE_WEIGHTED_BUDGET`, everything else uses 1. At budget 100 the ceiling
 * allows 24 choices; at budget 1 it allows 1250.
 */
export function assertBallotShape(numCandidates: number, budget: number): void {
  const branches = numCandidates * (budget + 1);
  if (branches > MAX_PROOF_BRANCHES) {
    throw new TeConfigError(
      `${numCandidates} choices at budget ${budget} means ${branches} proof ` +
        `branches per ballot, over the ${MAX_PROOF_BRANCHES} the protocol allows. ` +
        `Every keyper and auditor verifies every ballot. Reduce the choices, or ` +
        `lower TE_WEIGHTED_BUDGET (at budget ${budget} the limit is ` +
        `${Math.floor(MAX_PROOF_BRANCHES / (budget + 1))} choices)`
    );
  }
}

/**
 * How large a BSGS search this deployment's coordinator can actually solve.
 *
 * `budget x Σ(admitted weights)`, and the single place that number is defined —
 * geg deliberately no longer decides it, because feasibility depends on the
 * machine the coordinator runs on and a library cannot see that. Sized from the
 * table in `generalised-el-gamal/docs/COORDINATOR_SIZING.md`: cost is
 * `2√bound x 11 µs` of wall clock and `218 B x √bound` of memory, so 1e12 is about
 * 21 s and 220 MB, and quadrupling the bound doubles both.
 *
 * The default corresponds to roughly a 1 GB coordinator with headroom. Raise it
 * only alongside the memory to match: overshooting means a tally that runs for
 * hours or gets OOM-killed, which `recover_result` now refuses up front rather
 * than discovering the hard way.
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
 * Parse `TE_KEYPERS`: a comma-separated list of keyper URLs, and nothing else.
 *
 * Addresses are deliberately not configurable here. Each keyper reports the key it
 * will sign with at its own `/status`, and `resolveCommittee` reads it there — the
 * same way the protocol's admin UI assembles a committee before registering an
 * election. Accepting a second, hand-maintained copy of the same fact only creates
 * somewhere for it to go stale.
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

/**
 * Turn configured keyper URLs into the committee that gets frozen onto a proposal.
 *
 * Each keyper's `/status` reports the signing address it will actually sign with,
 * which is how the protocol's own admin UI assembles a committee before registering
 * an election. What makes that safe is *when* it happens and what is checked, not
 * the fetch itself:
 *
 *  - **Once per process.** The result is cached against the exact `TE_KEYPERS`
 *    string, so a committee is resolved on the first private proposal after boot
 *    and reused thereafter. Resolving on every creation would mean one unattended
 *    lookup per proposal, each an opportunity to be answered by the wrong host.
 *  - **Distinctness is enforced.** Two URLs reporting the same address is refused.
 *    This is not tidiness: a committee that looks like 3 members but is 2 keys
 *    makes `t = 2` satisfiable by one operator, which quietly voids the entire
 *    threshold guarantee.
 *  - **Unreachable is fatal.** The result is frozen onto the proposal and the DKG
 *    needs every member, so guessing at an absent keyper only defers the failure to
 *    `voting_start`, where it is terminal.
 *
 * Failures name the URL, because "the committee is wrong" with three endpoints and
 * no attribution is the least actionable error this system can produce.
 */
const committeeCache = new Map<string, TeKeyper[]>();

/** Visible for tests: forget any resolved committee. */
export function clearCommitteeCache(): void {
  committeeCache.clear();
}

export async function resolveCommittee(
  entries: TeKeyperEntry[],
  raw: string,
  timeoutMs = 5000
): Promise<TeKeyper[]> {
  const cached = committeeCache.get(raw);
  if (cached) return cached;

  const resolved = await Promise.all(
    entries.map(async entry => {
      // Unreachable is fatal, and should be: the DKG needs *every* member, so a
      // keyper that cannot be reached now would fail the ceremony anyway. Failing
      // here tells the author immediately, instead of producing a proposal that
      // dies at voting_start with no way back.
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

/** True when the deployment is configured to accept private proposals at all. */
export function isTeConfigured(env: TeEnv = readTeEnv()): boolean {
  return Boolean(env.keypers?.trim());
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
  if (!Number.isInteger(n))
    throw new TeConfigError(`${name} must be an integer`);
  return n;
}

/**
 * Build the snapshot for one proposal, rejecting a misconfigured committee.
 *
 * Every check here mirrors a constraint the protocol's own config type enforces.
 * They run at creation so a bad committee fails in front of the author with a
 * readable message, rather than silently producing a proposal whose key
 * generation can never complete — which would otherwise surface minutes later
 * as an unexplained terminal failure.
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

  // Addresses come from each keyper's /status. Distinctness is enforced there,
  // since it depends on the resolved values.
  const keypers = await resolveCommittee(entries, env.keypers ?? '');

  const thresholdN = keypers.length;
  const thresholdT = requireInt(env.thresholdT, 'TE_THRESHOLD_T', 2);
  // `TE_THRESHOLD_T` is the **quorum**: the number of keypers that must act
  // together, so a 2-of-3 committee is t = 2, n = 3.
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
 * The columns to write alongside a private proposal.
 *
 * `te_geg_config` is the authority. The four `te_threshold_*` / `te_keyper_*`
 * columns are denormalised copies for readers that already exist — the UI's
 * committee card, and the hub's write-authorisation path which indexes
 * `te_keyper_addresses[keyper_index - 1]`. Never edit those to fix a
 * disagreement; regenerate them from the snapshot.
 */
/**
 * Parse a stored committee snapshot without validating it.
 *
 * Used where a *missing or malformed* snapshot should degrade rather than throw —
 * `ballotParamsColumn` falls back to `scale: 1`, which is the correct reading of a
 * proposal that has no frozen bound.
 */
export function parseCommitteeSnapshotLoose(
  teGegConfig: unknown
): { maxTotalWeight?: number; solverCeiling?: number } | null {
  try {
    const snapshot =
      typeof teGegConfig === 'string'
        ? JSON.parse(teGegConfig)
        : (teGegConfig as any);
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
  } catch {
    return null;
  }
}

export function frozenWeightedBudget(teGegConfig: unknown): number {
  const snapshot =
    typeof teGegConfig === 'string'
      ? JSON.parse(teGegConfig)
      : (teGegConfig as any);
  const budget = Number(snapshot?.weightedBudget);
  if (!Number.isInteger(budget) || budget < 1) {
    throw new TeConfigError(
      `te_geg_config.weightedBudget is missing or invalid (${snapshot?.weightedBudget})`
    );
  }
  return budget;
}

/** The deployment's weighted budget, for sizing the fallback before the snapshot exists. */
export function weightedBudgetFromEnv(): number {
  const v = Number(readTeEnv().weightedBudget ?? 100);
  return Number.isFinite(v) && v >= 1 ? v : 100;
}

/**
 * `V` when no strategy can supply one — an unrecognised strategy, or none at all.
 *
 * **Derived, never configured.** It is `floor(ceiling / budget)`: the largest total
 * weight this deployment can tally without scaling. That is not an estimate of the
 * space's real voting power, and it is not trying to be — for `ticket`, `whitelist`
 * and most of Snapshot's strategies no upper bound is knowable, so the only
 * defensible number is a statement about *our* capacity rather than a guess about
 * theirs.
 *
 * There is deliberately no env var for this. An earlier version had
 * `TE_VOTING_POWER_FALLBACK`, defaulting to a flat `1e12`, on the theory that
 * over-estimating `V` is free. It is not: `s` is chosen so `budget x (V / s)` fits
 * the ceiling, so an over-estimate does not sit unused — it *forces scaling*, and
 * every voter's power is divided for no reason. At the shipped defaults (`V = 1e12`,
 * ceiling `1e12`, budget 100) that produced `s = 128` on a space whose real turnout
 * was a few tens of thousands: a 25,000 holder counted as 195.
 *
 * The knob could only ever be set wrong. Above this value it forces needless
 * scaling; below it, it also forces needless scaling *and* narrows the alarm. The
 * one number an operator should turn is `TE_SOLVER_CEILING`, which is a real
 * statement about the coordinator's hardware — raising the fallback without raising
 * the ceiling would just be a lie about capacity.
 *
 * `V` doubles as the ingest alarm's threshold (H9), and this value is the right one
 * there too: the alarm fires exactly when accumulated weight reaches what the
 * coordinator can actually solve.
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
  // Carried on the proposal so the voter can be told, before signing, what their
  // power will actually count as. Without it the pre-signature notice silently reads
  // "no scaling" on a scaled proposal — which is the exact surprise the notice
  // exists to prevent.
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

export function committeeColumns(snapshot: TeCommitteeSnapshot): {
  te_geg_config: string;
  te_threshold_t: number;
  te_threshold_n: number;
  te_keyper_urls: string;
  te_keyper_addresses: string;
} {
  return {
    te_geg_config: JSON.stringify(snapshot),
    te_threshold_t: snapshot.thresholdT,
    te_threshold_n: snapshot.thresholdN,
    te_keyper_urls: JSON.stringify(snapshot.keypers.map(k => k.url)),
    te_keyper_addresses: JSON.stringify(snapshot.keypers.map(k => k.address))
  };
}
