import snapshot from '@snapshot-labs/snapshot.js';
import { getProposal, getSpace } from '../helpers/actions';
import log from '../helpers/log';
import { containsFlaggedLinks } from '../helpers/moderation';
import db from '../helpers/mysql';
import { effectivePrivacy } from '../helpers/privacy';
import {
  ballotParamsColumn,
  buildCommitteeSnapshot,
  committeeColumns,
  frozenWeightedBudget,
  parseCommitteeSnapshotLoose,
  TeConfigError,
  votingPowerFallback,
  weightedBudgetFromEnv
} from '../helpers/teCommittee';
import { getEligibilityKey } from '../helpers/teEligibility';
import { resolveVotingPowerBound } from '../helpers/teVotingPowerBound';
import { jsonParse, validateChoices } from '../helpers/utils';

const MIN_DKG_LEAD_TIME_S = parseInt(
  process.env.MIN_DKG_LEAD_TIME_S || '180',
  10
);

// We don't need most of the checks used https://github.com/snapshot-labs/snapshot-sequencer/blob/89992b49c96fedbbbe33b42041c9cbe5a82449dd/src/writer/proposal.ts#L62
// because we assume that those checks were already done during the proposal creation
export function getSpaceUpdateError({ type, space }): string | undefined {
  const { voting = {} } = space;

  if (voting.type && type !== voting.type) return 'space voting type mismatch';

  return undefined;
}

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const space = await getSpace(msg.space);
  space.id = msg.space;

  const schemaIsValid: any = snapshot.utils.validateSchema(
    snapshot.schemas.updateProposal,
    msg.payload,
    {
      spaceType: space.turbo ? 'turbo' : 'default'
    }
  );
  if (schemaIsValid !== true) {
    log.warn('[writer] Wrong proposal format', schemaIsValid);
    return Promise.reject('wrong proposal format');
  }

  const proposal = await getProposal(msg.space, msg.payload.proposal);
  if (!proposal) return Promise.reject('unknown proposal');

  const timestampNow = Math.floor(Date.now() / 1e3);
  if (proposal.start < timestampNow)
    return Promise.reject('proposal already started');

  const isChoicesValid = validateChoices({
    type: msg.payload.type,
    choices: msg.payload.choices
  });
  if (!isChoicesValid) {
    return Promise.reject(
      `wrong choices for "${msg.payload.type}" type voting`
    );
  }

  if (proposal.author.toLowerCase() !== body.address.toLowerCase())
    return Promise.reject('Not the author');

  const spacePrivacy = space.voting?.privacy ?? 'any';
  const proposalPrivacy = msg.payload.privacy;

  if (
    proposalPrivacy !== undefined &&
    spacePrivacy !== 'any' &&
    spacePrivacy !== proposalPrivacy
  ) {
    return Promise.reject('not allowed to set privacy');
  }

  const spaceUpdateError = getSpaceUpdateError({
    type: msg.payload.type,
    space
  });
  if (spaceUpdateError) return Promise.reject(spaceUpdateError);

  // An update can turn a public proposal private, and this endpoint has no
  // lead-time gate of its own. Without the check below, an author could create a
  // proposal starting in ten seconds and then flip its privacy — bypassing the
  // gate in writer/proposal.ts entirely and leaving a proposal whose key
  // generation cannot possibly finish before voting opens.
  const privacy = effectivePrivacy(space, msg.payload, proposal);
  if (privacy === 'shutter-elgamal' && !proposal.te_mpk) {
    const now = Math.floor(Date.now() / 1e3);
    if (proposal.start - now < MIN_DKG_LEAD_TIME_S) {
      return Promise.reject(
        `shutter-elgamal proposals must start at least ${MIN_DKG_LEAD_TIME_S}s from now to allow DKG to complete`
      );
    }
  }

  return Promise.resolve(proposal);
}

export async function action(body, ipfs): Promise<void> {
  const msg = jsonParse(body.msg);
  const updated = parseInt(msg.timestamp);
  const metadata = msg.payload.metadata || {};
  const plugins = JSON.stringify(metadata.plugins || {});
  const spaceSettings = await getSpace(msg.space);
  const existing = await getProposal(msg.space, msg.payload.proposal);
  const privacy = effectivePrivacy(spaceSettings, msg.payload, existing);

  const proposal = {
    ipfs,
    updated,
    type: msg.payload.type,
    plugins,
    title: msg.payload.name,
    body: msg.payload.body,
    discussion: msg.payload.discussion,
    choices: JSON.stringify(msg.payload.choices),
    labels: msg.payload.labels?.length
      ? JSON.stringify(msg.payload.labels)
      : null,
    privacy,
    scores: JSON.stringify([]),
    scores_by_strategy: JSON.stringify([]),
    flagged: +containsFlaggedLinks(msg.payload.body)
  };

  // A proposal that only just became private has no committee snapshot, because
  // creation took the public path. Write one now so it is not left in a state
  // where the key ceremony has nothing to run against. An already-private
  // proposal keeps the snapshot it was created with — the committee is frozen
  // for its whole life, and re-deriving it here could silently swap the
  // committee under a proposal mid-ceremony if env changed in between.
  let frozenBudget: number | null = null;
  if (privacy === 'shutter-elgamal' && existing && !existing.te_geg_config) {
    try {
      const snapshot = await buildCommitteeSnapshot({
        eligibilityKey: await getEligibilityKey(),
        votingStart: existing.start,
        votingEnd: existing.end,
        // Same rule the hub applies live: the space's first admin, or the
        // author when it lists none.
        adminAddress:
          (Array.isArray(spaceSettings?.admins)
            ? spaceSettings.admins.find((a: any) => typeof a === 'string' && a)
            : undefined) || existing.author,
        // A proposal that only just turned private is being registered now, so `V`
        // is resolved now — against the snapshot block it was *created* with, which
        // is the block its voting power will be read at.
        maxTotalWeight: (
          await resolveVotingPowerBound({
            strategies: spaceSettings?.strategies ?? [],
            proposalNetwork: String(spaceSettings?.network ?? '1'),
            snapshotBlock: Number(existing.snapshot ?? 0),
            // Sized against the budget this proposal will actually use, matching
            // `action()` in proposal.ts. A weighted proposal's budget is the
            // deployment's; a basic one is 1.
            fallbackValue: votingPowerFallback(
              msg.payload.type === 'weighted' ? weightedBudgetFromEnv() : 1
            )
          })
        ).value
      });
      Object.assign(proposal, committeeColumns(snapshot));
      frozenBudget = snapshot.weightedBudget;
    } catch (err: any) {
      const reason =
        err instanceof TeConfigError
          ? err.message
          : 'could not reach the eligibility service';
      log.warn(`[writer] private voting unavailable on update: ${reason}`);
      return Promise.reject(`private voting unavailable: ${reason}`);
    }
  }

  // The ballot's shape follows `choices` and `type`, and both are editable here
  // until voting opens — so the stored copy has to follow them. A stale one is
  // not inert: `writer/vote.ts` verifies every incoming ballot against it, so a
  // proposal edited after creation would reject the very ballots the browser
  // builds from its own (correct) reading of the same fields.
  if (privacy === 'shutter-elgamal') {
    try {
      const budget =
        frozenBudget ?? frozenWeightedBudget(existing?.te_geg_config);
      Object.assign(
        proposal,
        // The snapshot is the authority for both halves: an author editing `type`
        // changes `budget`, and `scale` has to follow it.
        ballotParamsColumn(
          msg.payload.choices,
          msg.payload.type,
          budget,
          parseCommitteeSnapshotLoose(existing?.te_geg_config)
        )
      );
    } catch (err: any) {
      log.warn(
        `[writer] cannot rebuild ballot params for ${msg.payload.proposal}: ${err?.message || err}`
      );
      return Promise.reject(
        `private voting unavailable: ${err?.message || err}`
      );
    }
  }

  const query = 'UPDATE proposals SET ? WHERE id = ? LIMIT 1';
  const params: any[] = [proposal, msg.payload.proposal];

  await db.queryAsync(query, params);
}
