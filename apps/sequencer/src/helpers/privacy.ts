/**
 * One answer to "is this proposal private, and how?", for every writer.
 *
 * The rule has two halves and both are easy to get subtly wrong:
 *
 *   1. A space that pins its privacy wins outright. `voting.privacy` of `'any'`
 *      means "the author chooses"; anything else — including `''` — is the
 *      space forcing that mode, and the payload cannot override it.
 *   2. Otherwise the author's payload decides, and **an omitted `privacy` is not
 *      a request to make the proposal public.** `privacy` is optional in the
 *      `updateProposal` schema, so a client that simply does not mention it is
 *      saying nothing about privacy. Going public is spelled `privacy: ''`,
 *      which is a distinct value the schema accepts and the UI already sends.
 *
 * That second half is the one that bit us. `writer/update-proposal` derived
 * privacy twice — `verify()` fell back to the proposal's current value, while
 * `action()` fell back to `''` — so an update omitting `privacy` passed the
 * `shutter-elgamal` lead-time gate as private and was then written public. The
 * proposal kept its `te_geg_config`, `te_mpk` and keyper rows while dropping out
 * of `te_geg_elections`, stranding a key ceremony that nothing would ever
 * finish, and answering 400 on every geg read thereafter. Nothing in the
 * response said privacy had changed. That is finding L-2.
 *
 * The fix is not "pick the right fallback" but "derive it once": the two halves
 * were each defensible on their own, and the bug lived only in the gap between
 * them. Creation passes no `existing`, which collapses the chain to the `''` it
 * already used — a proposal that does not exist yet has no privacy to preserve.
 */

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
