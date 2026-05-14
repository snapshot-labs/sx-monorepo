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
import { validateSpaceSettings } from '../helpers/spaceValidation';
import {
  captureError,
  getQuorum,
  jsonParse,
  validateChoices
} from '../helpers/utils';

const scoreAPIUrl = process.env.SCORE_API_URL || 'https://score.snapshot.org';
const broviderUrl = process.env.BROVIDER_URL || 'https://rpc.snapshot.org';

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

  const tsInt = (Date.now() / 1e3).toFixed();
  if (msg.payload.end <= tsInt) {
    return Promise.reject('proposal end date must be in the future');
  }

  const isChoicesValid = validateChoices({
    type: msg.payload.type,
    choices: msg.payload.choices
  });
  if (!isChoicesValid)
    return Promise.reject('wrong choices for basic type voting');

  // if (msg.payload.start < created) return Promise.reject('invalid start date');

  if (space.voting?.delay) {
    const isValidDelay = msg.payload.start === created + space.voting.delay;
    if (!isValidDelay) return Promise.reject('invalid voting delay');
  }

  if (space.voting?.period) {
    const isValidPeriod =
      msg.payload.end - msg.payload.start === space.voting.period;
    if (!isValidPeriod) return Promise.reject('invalid voting period');
  }

  if (space.voting?.type) {
    if (msg.payload.type !== space.voting.type)
      return Promise.reject('invalid voting type');
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

  try {
    if (await isMalicious(msg.payload, space.id)) {
      return Promise.reject('invalid proposal content');
    }
  } catch (err) {
    log.warn('[writer] Failed to check proposal content', err);
  }

  if (flaggedAddresses.includes(addressLC))
    return Promise.reject('invalid proposal, please contact support');

  const onlyAuthors = space.filters?.onlyMembers;
  const members = [
    ...(space.members || []),
    ...(space.admins || []),
    ...(space.moderators || [])
  ].map(member => member.toLowerCase());
  const isAuthorized = members.includes(addressLC);

  if (onlyAuthors && !isAuthorized)
    return Promise.reject('only space authors can propose');
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

  if (msg.payload.snapshot < networks[space.network].start)
    return Promise.reject('proposal snapshot must be after network start');

  try {
    const provider = snapshot.utils.getProvider(space.network, { broviderUrl });
    const block = await provider.getBlock(msg.payload.snapshot);
    if (!block) return Promise.reject('invalid snapshot block');
  } catch (err: any) {
    if (err.message?.includes('invalid block hash or block tag'))
      return Promise.reject('invalid snapshot block');
    return Promise.reject('unable to fetch block');
  }

  try {
    const [{ dayCount, monthCount, activeProposalsByAuthor }] =
      await getProposalsCount(space.id, body.address);

    const dayLimit =
      limits[`space.${spaceTypeWithEcosystem}.proposal_limit_per_day`];
    const monthLimit =
      limits[`space.${spaceTypeWithEcosystem}.proposal_limit_per_month`];

    if (dayCount >= dayLimit || monthCount >= monthLimit)
      return Promise.reject('proposal limit reached');
    const activeProposalLimitPerAuthor =
      limits['space.active_proposal_limit_per_author'];
    if (
      !isAuthorized &&
      activeProposalsByAuthor >= activeProposalLimitPerAuthor
    )
      return Promise.reject('active proposal limit reached for author');
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
  const created = parseInt(msg.timestamp);
  const metadata = msg.payload.metadata || {};
  const strategies = JSON.stringify(spaceSettings.strategies);
  const validation = JSON.stringify(spaceSettings.voteValidation || {});
  const plugins = JSON.stringify(metadata.plugins || {});
  const spaceNetwork = spaceSettings.network;
  const proposalSnapshot = parseInt(msg.payload.snapshot || '0');
  let privacy = spaceSettings.voting?.privacy ?? 'any';
  if (privacy === 'any') {
    privacy = msg.payload.privacy ?? '';
  }

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
    start: parseInt(msg.payload.start || '0'),
    end: parseInt(msg.payload.end || '0'),
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

  const query = `
    INSERT INTO proposals SET ?;
    INSERT INTO leaderboard (space, user, proposal_count)
      VALUES(?, ?, 1)
      ON DUPLICATE KEY UPDATE proposal_count = proposal_count + 1;
    UPDATE spaces SET proposal_count = proposal_count + 1 WHERE id = ?;
  `;

  await db.queryAsync(query, [proposal, space, author, space]);
}
