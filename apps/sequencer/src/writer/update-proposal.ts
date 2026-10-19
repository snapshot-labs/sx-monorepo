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
  getPrivateBallotError,
  parseCommitteeSnapshotLoose,
  TeCommitteeSnapshot,
  TeConfigError,
  votingPowerFallback,
  weightedBudgetFromEnv
} from '../helpers/teCommittee';
import { getEligibilityKey } from '../helpers/teEligibility';
import {
  resolveVotingPowerBound,
  VotingPowerBoundError
} from '../helpers/teVotingPowerBound';
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
  if (proposal.start < timestampNow) {
    return Promise.reject('proposal already started');
  }

  const isChoicesValid = validateChoices({
    type: msg.payload.type,
    choices: msg.payload.choices
  });
  if (!isChoicesValid) {
    return Promise.reject(
      `wrong choices for "${msg.payload.type}" type voting`
    );
  }

  if (proposal.author.toLowerCase() !== body.address.toLowerCase()) {
    return Promise.reject('Not the author');
  }

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

  // An update can make a public proposal private, so it needs the same checks as
  // creation in writer/proposal.ts, including enough lead time for key generation
  // to finish before voting opens.
  const privacy = effectivePrivacy(space, msg.payload, proposal);
  if (privacy === 'shutter-elgamal') {
    let ballotError: string | undefined;
    try {
      ballotError = getPrivateBallotError(
        msg.payload.type,
        msg.payload.choices.length,
        // The budget `action` will write: the frozen one if already private.
        proposal.te_sgp_config
          ? frozenWeightedBudget(proposal.te_sgp_config)
          : weightedBudgetFromEnv()
      );
    } catch (err: any) {
      ballotError = `private voting unavailable: ${err.message}`;
    }
    if (ballotError) return Promise.reject(ballotError);
  }
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

  // A public proposal must not keep any private-voting state, or it would be left
  // with a key ceremony nothing finishes.
  if (privacy !== 'shutter-elgamal') {
    Object.assign(proposal, {
      te_config: null,
      te_mpk: null,
      te_committee_pks: null,
      te_threshold_t: null,
      te_threshold_n: null,
      te_keyper_addresses: null,
      te_aggregate: null,
      te_sgp_config: null,
      te_tally_stalled: 0,
      te_tally_stall_reason: null
    });
  }

  // A proposal that just became private has no committee snapshot yet, so build
  // one now. An already-private proposal keeps its snapshot: the committee is
  // fixed for the proposal's life, even if env has changed.
  let frozenSnapshot: TeCommitteeSnapshot | null = null;
  if (privacy === 'shutter-elgamal' && existing && !existing.te_sgp_config) {
    try {
      const snapshot = await buildCommitteeSnapshot({
        eligibilityKey: await getEligibilityKey(),
        votingStart: existing.start,
        votingEnd: existing.end,
        // Same rule as the hub: the space's first admin, or the author if none.
        adminAddress:
          (Array.isArray(spaceSettings?.admins)
            ? spaceSettings.admins.find((a: any) => typeof a === 'string' && a)
            : undefined) || existing.author,
        // Resolved at the proposal's snapshot block, where its voting power is
        // read.
        maxTotalWeight: (
          await resolveVotingPowerBound({
            strategies: spaceSettings?.strategies ?? [],
            proposalNetwork: String(spaceSettings?.network ?? '1'),
            snapshotBlock: Number(existing.snapshot ?? 0),
            // Sized for the weighted budget whatever the type, as in proposal.ts,
            // so a later type change does not force scaling.
            fallbackValue: votingPowerFallback(weightedBudgetFromEnv())
          })
        ).value
      });
      Object.assign(proposal, committeeColumns(snapshot));
      frozenSnapshot = snapshot;
    } catch (err: any) {
      const reason =
        err instanceof TeConfigError || err instanceof VotingPowerBoundError
          ? err.message
          : 'could not reach the eligibility service';
      log.warn(`[writer] private voting unavailable on update: ${reason}`);
      return Promise.reject(`private voting unavailable: ${reason}`);
    }
  }

  // The ballot params depend on `choices` and `type`, which can be edited here, so
  // rebuild them. `writer/vote.ts` checks every ballot against them, so stale
  // params would reject valid ballots.
  if (privacy === 'shutter-elgamal') {
    try {
      const committee =
        frozenSnapshot ?? parseCommitteeSnapshotLoose(existing?.te_sgp_config);
      const budget =
        frozenSnapshot?.weightedBudget ??
        frozenWeightedBudget(existing?.te_sgp_config);
      Object.assign(
        proposal,
        // Changing `type` changes `budget`, so `scale` is recomputed from the
        // snapshot too.
        ballotParamsColumn(
          msg.payload.choices,
          msg.payload.type,
          budget,
          committee
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
