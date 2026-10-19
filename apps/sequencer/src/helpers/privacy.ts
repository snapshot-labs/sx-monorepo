/**
 * Decides a proposal's privacy for every writer, so creation and update agree.
 *
 * 1. If the space's `voting.privacy` is anything other than `'any'` (including
 *    `''`), the space forces that mode and the payload cannot override it.
 * 2. Otherwise the payload decides. An omitted `privacy` keeps the existing value
 *    (it is optional in the `updateProposal` schema); making a proposal public
 *    is sent as `privacy: ''`. On creation there is no existing value, so the
 *    default is `''`.
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
