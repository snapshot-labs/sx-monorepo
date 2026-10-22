/**
 * Private-voting rules shared by the proposal and update-proposal writers, so
 * creation and update agree.
 *
 * Privacy:
 *
 * 1. If the space's `voting.privacy` is anything other than `'any'` (including
 *    `''`), the space forces that mode and the payload cannot override it.
 * 2. Otherwise the payload decides. An omitted `privacy` keeps the existing value
 *    (it is optional in the `updateProposal` schema); making a proposal public
 *    is sent as `privacy: ''`. On creation there is no existing value, so the
 *    default is `''`.
 */

import log from './log';
import {
  buildCommitteeSnapshot,
  TeCommitteeSnapshot,
  votingPowerFallback,
  weightedBudgetFromEnv
} from './teCommittee';
import { resolveVotingPowerBound } from './teVotingPowerBound';

type PrivacyCarrier = { privacy?: string | null } | null | undefined;
type SpaceLike = { voting?: { privacy?: string | null } | null } | null;

/**
 * The privacy a write should apply, as stored: `''` for public.
 *
 * @param space     the space, whose `voting.privacy` may pin the mode
 * @param payload   the signed message payload
 * @param existing  the proposal being edited; omit on creation
 */
export function effectivePrivacy(
  space: SpaceLike,
  payload: PrivacyCarrier,
  existing?: PrivacyCarrier
): string {
  const spacePrivacy = space?.voting?.privacy ?? 'any';
  if (spacePrivacy !== 'any') return spacePrivacy;

  return payload?.privacy ?? existing?.privacy ?? '';
}

const MIN_DKG_LEAD_TIME_S = parseInt(
  process.env.MIN_DKG_LEAD_TIME_S || '180',
  10
);

/** Why a private proposal starting at `start` is too soon for key generation. */
export function leadTimeError(start: number): string | undefined {
  if (start - Math.floor(Date.now() / 1e3) >= MIN_DKG_LEAD_TIME_S) return;
  return `shutter-elgamal proposals must start at least ${MIN_DKG_LEAD_TIME_S}s from now to allow DKG to complete`;
}

/**
 * The config's admin address: the space's first admin, or the author if the space
 * lists none. Same rule the hub uses to decide who may resume a stalled tally.
 */
export function adminForConfig(space: any, author: string): string {
  const admins = Array.isArray(space?.admins) ? space.admins : [];
  const first = admins.find((a: any) => typeof a === 'string' && a);
  return first || author;
}

/**
 * Resolves `V` at the proposal's snapshot block and builds the committee snapshot
 * that is frozen onto the proposal.
 *
 * An RPC failure throws `VotingPowerBoundError` so the author can retry; the block
 * is fixed, so a retry gives the same value. The fallback is sized for the
 * weighted budget whatever the type, because `type` can be changed to weighted
 * until voting opens.
 */
export async function buildProposalSnapshot(args: {
  proposalId: string;
  space: any;
  author: string;
  start: number;
  end: number;
  snapshotBlock: number;
  eligibilityKey: string;
}): Promise<TeCommitteeSnapshot> {
  const bound = await resolveVotingPowerBound({
    strategies: args.space?.strategies ?? [],
    proposalNetwork: String(args.space?.network ?? '1'),
    snapshotBlock: args.snapshotBlock,
    fallbackValue: votingPowerFallback(weightedBudgetFromEnv())
  });
  log.info(
    `[te-vpbound] ${args.proposalId}: V=${bound.value} via ${bound.source}${
      bound.unrecognised ? ` (unrecognised: ${bound.unrecognised})` : ''
    }`
  );
  return buildCommitteeSnapshot({
    eligibilityKey: args.eligibilityKey,
    votingStart: args.start,
    votingEnd: args.end,
    adminAddress: adminForConfig(args.space, args.author),
    maxTotalWeight: bound.value
  });
}
