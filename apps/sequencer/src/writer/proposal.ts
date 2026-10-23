import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { uniq } from 'lodash';
import { CB } from '../constants';
import { getPremiumNetworkIds, getSpace } from '../helpers/actions';
import log from '../helpers/log';
import { containsFlaggedLinks, flaggedAddresses } from '../helpers/moderation';
import { isMalicious } from '../helpers/monitoring';
import db from '../helpers/mysql';
import { getLimits, getSpaceType } from '../helpers/options';
import {
  adminForConfig,
  buildProposalSnapshot,
  effectivePrivacy,
  leadTimeError
} from '../helpers/privacy';
import { getProvider } from '../helpers/provider';
import { validateSpaceSettings } from '../helpers/spaceValidation';
import {
  ballotParamsColumn,
  buildCommitteeSnapshot,
  committeeColumns,
  getPrivateBallotError,
  TeConfigError,
  weightedBudgetFromEnv
} from '../helpers/teCommittee';
import { getEligibilityKey } from '../helpers/teEligibility';
import { VotingPowerBoundError } from '../helpers/teVotingPowerBound';
import {
  captureError,
  getQuorum,
  jsonParse,
  validateChoices
} from '../helpers/utils';

const scoreAPIUrl = process.env.SCORE_API_URL || 'https://score.snapshot.org';

// The start can't be earlier than the voting delay from now (e.g. a Safe
// signature confirmed late), the end follows the voting period when set
export function getProposalTimeline(
  payload: { start: number; end: number },
  voting?: { delay?: number; period?: number },
  now = Math.floor(Date.now() / 1e3)
) {
  const start = Math.max(payload.start, now + (voting?.delay || 0));
  const end = voting?.period ? start + voting.period : payload.end;
  return { start, end };
}

export const getProposalsCount = async (space, author) => {
  const query = `
  SELECT
    dayCount,
    monthCount,
    activeProposalsByAuthor
  FROM
    (SELECT
        COUNT(IF(a.created > (UNIX_TIMESTAMP() - 86400), 1, NULL)) AS dayCount,
        COUNT(*) AS monthCount
    FROM proposals AS a
    WHERE a.space = ? AND a.created > (UNIX_TIMESTAMP() - 2592000)
    ) AS proposalsCountBySpace
  CROSS JOIN
    (SELECT
        COUNT(*) AS activeProposalsByAuthor
    FROM proposals AS b
    WHERE b.author = ? and b.end > UNIX_TIMESTAMP()
    ) AS proposalsCountByAuthor;
  `;
  return await db.queryAsync(query, [space, author]);
};

async function checkNonPremiumNetworksOnSpace(space: any) {
  const premiumNetworks = await getPremiumNetworkIds();
  const spaceNetworks = uniq([
    space.network,
    ...space.strategies.map((strategy: any) => strategy.network),
    ...space.strategies.flatMap((strategy: any) =>
      Array.isArray(strategy.params?.strategies)
        ? strategy.params.strategies.map((param: any) => param.network)
        : []
    )
  ]).filter(Boolean);

  const nonPremiumNetworks = spaceNetworks.filter(
    network => !premiumNetworks.includes(network)
  );

  if (nonPremiumNetworks.length > 0) {
    return Promise.reject('space is using a non-premium network');
  }
}

async function validateSpace(space: any) {
  if (!space) {
    return Promise.reject('unknown space');
  }

  if (space.hibernated) {
    return Promise.reject('space hibernated');
  }

  await validateSpaceSettings(space);
}

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  const created = parseInt(msg.timestamp);
  const addressLC = body.address.toLowerCase();
  const space = await getSpace(msg.space);
  try {
    await validateSpace(space);
  } catch (err) {
    return Promise.reject(`invalid space settings: ${err}`);
  }

  space.id = msg.space;

  const spaceType = await getSpaceType(space);
  const spaceTypeWithEcosystem = await getSpaceType(space, true);

  if (spaceType !== 'turbo') await checkNonPremiumNetworksOnSpace(space);

  const limits = await getLimits([
    `space.${spaceType}.body_limit`,
    `space.${spaceType}.choices_limit`,
    'space.active_proposal_limit_per_author',
    `space.${spaceTypeWithEcosystem}.proposal_limit_per_day`,
    `space.${spaceTypeWithEcosystem}.proposal_limit_per_month`
  ]);

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.proposal,
    msg.payload,
    {
      spaceType: space.turbo ? 'turbo' : 'default'
    }
  );

  if (schemaIsValid !== true) {
    log.warn('[writer] Wrong proposal format', schemaIsValid);
    return Promise.reject('wrong proposal format');
  }

  const isChoicesValid = validateChoices({
    type: msg.payload.type,
    choices: msg.payload.choices
  });
  if (!isChoicesValid) {
    return Promise.reject('wrong choices for basic type voting');
  }

  if (space.voting?.delay) {
    const isValidDelay = msg.payload.start === created + space.voting.delay;
    if (!isValidDelay) return Promise.reject('invalid voting delay');
  }

  if (space.voting?.period) {
    const isValidPeriod =
      msg.payload.end - msg.payload.start === space.voting.period;
    if (!isValidPeriod) return Promise.reject('invalid voting period');
  }

  const { start, end } = getProposalTimeline(msg.payload, space.voting);
  if (end <= start) {
    return Promise.reject('proposal end date must be in the future');
  }

  if (space.voting?.type) {
    if (msg.payload.type !== space.voting.type) {
      return Promise.reject('invalid voting type');
    }
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

  if (effectivePrivacy(space, msg.payload) === 'shutter-elgamal') {
    const leadError = leadTimeError(msg.payload.start);
    if (leadError) return Promise.reject(leadError);
    const ballotError = getPrivateBallotError(
      msg.payload.type,
      msg.payload.choices.length,
      weightedBudgetFromEnv()
    );
    if (ballotError) return Promise.reject(ballotError);
    // Build the committee snapshot only to reject a misconfigured committee with a
    // clear error. `action` builds the one that is stored.
    try {
      await buildCommitteeSnapshot({
        eligibilityKey: await getEligibilityKey(),
        votingStart: parseInt(msg.payload.start),
        votingEnd: parseInt(msg.payload.end),
        adminAddress: adminForConfig(space, body.address),
        // Placeholder. The real bound needs RPC calls, so it is resolved only once,
        // in `action`, which runs in the same request.
        maxTotalWeight: 1
      });
    } catch (err: any) {
      if (err instanceof TeConfigError) {
        log.warn(`[writer] private voting misconfigured: ${err.message}`);
        return Promise.reject(`private voting unavailable: ${err.message}`);
      }
      log.warn(`[writer] eligibility key unavailable: ${err?.message || err}`);
      return Promise.reject(
        'private voting unavailable: could not reach the eligibility service'
      );
    }
  }

  try {
    if (await isMalicious(msg.payload, space.id)) {
      return Promise.reject('invalid proposal content');
    }
  } catch (err) {
    log.warn('[writer] Failed to check proposal content', err);
  }

  if (flaggedAddresses.includes(addressLC)) {
    return Promise.reject('invalid proposal, please contact support');
  }

  const onlyAuthors = space.filters?.onlyMembers;
  const members = [
    ...(space.members || []),
    ...(space.admins || []),
    ...(space.moderators || [])
  ].map(member => member.toLowerCase());
  const isAuthorized = members.includes(addressLC);

  if (onlyAuthors && !isAuthorized) {
    return Promise.reject('only space authors can propose');
  }
  if (!isAuthorized) {
    try {
      const validationName = space.validation?.name || 'basic';
      const validationParams = space.validation?.params || {};
      const minScore =
        space.validation?.params?.minScore || space.filters?.minScore;

      let isValid = false;
      // default case
      if (
        validationName === 'any' ||
        (validationName === 'basic' && !minScore)
      ) {
        isValid = true;
      } else {
        if (validationName === 'basic') {
          validationParams.minScore = minScore;
          validationParams.strategies =
            space.validation?.params?.strategies || space.strategies;
        }

        isValid = await snapshot.utils.validate(
          validationName,
          body.address,
          space.id,
          space.network,
          'latest',
          validationParams,
          { url: scoreAPIUrl }
        );
      }

      if (!isValid) return Promise.reject('validation failed');
    } catch (err: any) {
      captureError(err, { space: msg.space, address: body.address }, [504]);
      log.warn(
        `[writer] Failed to check proposal validation, ${msg.space}, ${
          body.address
        }, ${JSON.stringify(err)}`
      );
      return Promise.reject('failed to check validation');
    }
  }

  if (msg.payload.snapshot < networks[space.network].start) {
    return Promise.reject('proposal snapshot must be after network start');
  }

  try {
    const provider = getProvider(space.network);
    const block = await provider.getBlock(msg.payload.snapshot);
    if (!block) return Promise.reject('invalid snapshot block');
  } catch (err: any) {
    if (err.message?.includes('invalid block hash or block tag')) {
      return Promise.reject('invalid snapshot block');
    }
    return Promise.reject('unable to fetch block');
  }

  try {
    const [{ dayCount, monthCount, activeProposalsByAuthor }] =
      await getProposalsCount(space.id, body.address);

    const dayLimit =
      limits[`space.${spaceTypeWithEcosystem}.proposal_limit_per_day`];
    const monthLimit =
      limits[`space.${spaceTypeWithEcosystem}.proposal_limit_per_month`];

    if (dayCount >= dayLimit || monthCount >= monthLimit) {
      return Promise.reject('proposal limit reached');
    }
    const activeProposalLimitPerAuthor =
      limits['space.active_proposal_limit_per_author'];
    if (
      !isAuthorized &&
      activeProposalsByAuthor >= activeProposalLimitPerAuthor
    ) {
      return Promise.reject('active proposal limit reached for author');
    }
  } catch (err) {
    capture(err);
    return Promise.reject('failed to check proposals limit');
  }

  const bodyLengthLimit = limits[`space.${spaceType}.body_limit`];
  if (msg.payload.body.length > bodyLengthLimit) {
    return Promise.reject(
      `proposal body length can not exceed ${bodyLengthLimit} characters`
    );
  }

  const choicesLimit = limits[`space.${spaceType}.choices_limit`];
  if (msg.payload.choices.length > choicesLimit) {
    return Promise.reject(`number of choices can not exceed ${choicesLimit}`);
  }
}

export async function action(body, ipfs, receipt, id): Promise<void> {
  const msg = jsonParse(body.msg);
  const space = msg.space;

  /* Store the proposal in dedicated table 'proposals' */
  const spaceSettings = await getSpace(space);

  const author = body.address;
  const created = Math.floor(Date.now() / 1e3);
  const { start, end } = getProposalTimeline(
    msg.payload,
    spaceSettings.voting,
    created
  );
  const metadata = msg.payload.metadata || {};
  const strategies = JSON.stringify(spaceSettings.strategies);
  const validation = JSON.stringify(spaceSettings.voteValidation || {});
  const plugins = JSON.stringify(metadata.plugins || {});
  const spaceNetwork = spaceSettings.network;
  const proposalSnapshot = parseInt(msg.payload.snapshot || '0');
  const privacy = effectivePrivacy(spaceSettings, msg.payload);

  let quorum = spaceSettings.voting?.quorum || 0;
  if (!quorum && spaceSettings.plugins?.quorum) {
    try {
      quorum = await getQuorum(
        spaceSettings.plugins.quorum,
        spaceNetwork,
        proposalSnapshot
      );
    } catch (err: any) {
      log.warn('unable to get quorum', err.message);
      return Promise.reject('unable to get quorum');
    }
  }

  const proposal = {
    id,
    ipfs,
    author,
    created,
    space,
    network: spaceNetwork,
    symbol: spaceSettings.symbol || '',
    type: msg.payload.type || 'single-choice',
    strategies,
    plugins,
    title: msg.payload.name,
    body: msg.payload.body,
    discussion: msg.payload.discussion || '',
    choices: JSON.stringify(msg.payload.choices),
    labels: msg.payload.labels?.length
      ? JSON.stringify(msg.payload.labels)
      : null,
    start,
    end,
    quorum,
    quorum_type: (quorum && spaceSettings.voting?.quorumType) || '',
    privacy,
    snapshot: proposalSnapshot || 0,
    app: msg.payload.app,
    scores: JSON.stringify([]),
    scores_by_strategy: JSON.stringify([]),
    scores_state: 'pending',
    scores_total: 0,
    scores_updated: 0,
    scores_total_value: 0,
    vp_value_by_strategy: JSON.stringify([]),
    votes: 0,
    validation,
    flagged: +containsFlaggedLinks(msg.payload.body),
    cb: CB.PENDING_SYNC
  };

  // Freeze the committee onto the row; nothing rewrites these columns later.
  // `verify` already built a snapshot, so an error here is unexpected and aborts
  // the insert.
  if (privacy === 'shutter-elgamal') {
    // `spaceSettings`, not `space`: here `msg.space` is only the space id.
    let snapshot;
    try {
      snapshot = await buildProposalSnapshot({
        proposalId: proposal.id,
        space: spaceSettings,
        author: proposal.author,
        start: proposal.start,
        end: proposal.end,
        snapshotBlock: Number(proposal.snapshot ?? 0),
        eligibilityKey: await getEligibilityKey()
      });
    } catch (err: any) {
      // A supply read failed every retry; return a readable error, not a 500.
      if (!(err instanceof VotingPowerBoundError)) throw err;
      log.warn(`[writer] private voting unavailable: ${err.message}`);
      return Promise.reject(`private voting unavailable: ${err.message}`);
    }
    Object.assign(
      proposal,
      committeeColumns(snapshot),
      // Ballot params, needed to build and verify ballots. The budget comes from
      // the snapshot, not env, so the two always match.
      ballotParamsColumn(
        msg.payload.choices,
        msg.payload.type,
        snapshot.weightedBudget,
        snapshot
      )
    );
  }

  const query = `
    INSERT INTO proposals SET ?;
    INSERT INTO leaderboard (space, user, proposal_count)
      VALUES(?, ?, 1)
      ON DUPLICATE KEY UPDATE proposal_count = proposal_count + 1;
    UPDATE spaces SET proposal_count = proposal_count + 1 WHERE id = ?;
  `;

  await db.queryAsync(query, [proposal, space, author, space]);
}
