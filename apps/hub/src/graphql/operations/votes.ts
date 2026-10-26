import { capture } from '@snapshot-labs/snapshot-sentry';
import graphqlFields from 'graphql-fields';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import serve from '../../helpers/requestDeduplicator';
import {
  buildWhereQuery,
  checkLimits,
  formatProposal,
  formatSpace,
  formatVote
} from '../helpers';

// `where` keys the forced index (space, proposal, created, id) can evaluate
// itself. Any other key is a residual predicate the forced scan must walk the
// whole proposal to test, so keep this an allow-list: a deny-list fails open.
const INDEX_COVERED_WHERE_KEYS = new Set([
  'space',
  'space_in',
  'proposal',
  'proposal_in',
  'created',
  'created_in',
  'created_gt',
  'created_gte',
  'created_lt',
  'created_lte'
]);

async function query(parent, args, context?, info?) {
  const requestedFields = info ? graphqlFields(info) : {};
  const { first, skip } = args;
  const where = { ...(args.where || {}) };

  checkLimits(args, 'votes');

  const fields = {
    id: 'string',
    ipfs: 'string',
    space: 'string',
    voter: ['evmAddress', 'starknetAddress'],
    proposal: 'string',
    reason: 'string',
    app: 'string',
    created: 'number',
    vp: 'number',
    vp_state: 'string'
  };

  if (
    where.proposal === undefined &&
    Array.isArray(where.proposal_in) &&
    where.proposal_in.length === 1 &&
    typeof where.proposal_in[0] === 'string'
  ) {
    where.proposal = where.proposal_in[0];
    delete where.proposal_in;
  }

  if (
    where.space === undefined &&
    Array.isArray(where.space_in) &&
    where.space_in.length === 1 &&
    typeof where.space_in[0] === 'string'
  ) {
    where.space = where.space_in[0];
    delete where.space_in;
  }

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created', 'vp'].includes(orderBy)) orderBy = 'created';
  orderBy = `v.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const hasSelectiveFilter =
    where.id !== undefined ||
    where.id_in !== undefined ||
    where.ipfs !== undefined ||
    where.ipfs_in !== undefined ||
    where.voter !== undefined ||
    where.voter_in !== undefined;

  if (
    !hasSelectiveFilter &&
    orderBy === 'v.created' &&
    typeof where.proposal === 'string' &&
    where.space === undefined &&
    where.space_in === undefined
  ) {
    try {
      const proposalRows = await db.queryAsync(
        'SELECT space FROM proposals WHERE id = ? LIMIT 1',
        [where.proposal]
      );
      if (proposalRows.length === 0) return [];
      where.space = proposalRows[0].space;
    } catch (err: any) {
      capture(err, { args, context, info });
      log.error(`[graphql] votes, ${JSON.stringify(err)}`);
      return Promise.reject(new Error('request failed'));
    }
  }

  const whereQuery = buildWhereQuery(fields, 'v', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let votes: any[] = [];

  const isIndexCoveredWhere = Object.keys(where).every(
    key => where[key] === undefined || INDEX_COVERED_WHERE_KEYS.has(key)
  );
  const forceProposalIndex =
    isIndexCoveredWhere &&
    typeof where.proposal === 'string' &&
    typeof where.space === 'string' &&
    orderBy === 'v.created';
  const indexHint = forceProposalIndex
    ? 'FORCE INDEX (idx_votes_on_space_proposal_created_id)'
    : '';

  // Two queries instead of one, because of private (`shutter-elgamal`) ballots.
  //
  // A private vote stores its whole encrypted ballot in `choice`: about 150 KB at
  // three weighted choices, up to 1 MB at the 19-choice limit. When MySQL sorts
  // full rows, each row must fit in the sort buffer (256 KiB by default), so a
  // single `SELECT v.* … ORDER BY` fails with "Out of sort memory" as soon as one
  // such ballot is among the sorted rows: a voter's history, a proposal's votes.
  // Computing a smaller `choice` in that query does not help; MySQL still carries
  // the full column through the sort.
  //
  // 1. Pick the page by sorting only the primary key. Measured on 200,000 votes,
  //    this sort plus step 2 takes about a quarter of the old single query.
  // 2. Load those rows by primary key, which needs no sort. A private ballot's
  //    `choice` is cut to its first ciphertext component, the only part a vote
  //    list shows; whole ballots would let one public request load up to 1 GB
  //    into the hub. Whole ballots are served by `te_sgp_ballots`.
  //
  // cb = -3 marks votes of deleted proposals, pending deletion by the sequencer
  const query = `
    SELECT v.voter, v.space, v.proposal FROM votes v ${indexHint}
    WHERE v.space NOT IN (SELECT id FROM spaces WHERE deleted = 1)
      AND v.cb != -3 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection}, v.id ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    const keys = await db.queryAsync(query, params);
    if (keys.length > 0) {
      const keyOf = (v: any) => `${v.voter}\0${v.space}\0${v.proposal}`;
      // Every `votes` column, listed so that `choice` can be cut for private ballots.
      const rows = await db.queryAsync(
        `SELECT id, ipfs, voter, created, space, proposal,
                IF(JSON_CONTAINS_PATH(choice, 'one', '$.zkProof'),
                   JSON_OBJECT('ciphertexts', JSON_ARRAY(
                     JSON_OBJECT('c1', choice->'$.ciphertexts[0].c1'))),
                   choice) AS choice,
                metadata, reason, app, vp, vp_by_strategy, vp_state, cb, vp_value
           FROM votes WHERE (voter, space, proposal) IN (?)`,
        [keys.map(k => [k.voter, k.space, k.proposal])]
      );
      const byKey = new Map(rows.map(row => [keyOf(row), row]));
      votes = keys.map(k => byKey.get(keyOf(k))).filter(Boolean);
    }
    votes = votes.map(vote => formatVote(vote));
  } catch (err: any) {
    capture(err, { args, context, info });
    log.error(`[graphql] votes, ${JSON.stringify(err)}`);
    return Promise.reject(new Error('request failed'));
  }

  if (requestedFields.space && votes.length > 0) {
    const spaceIds = votes
      .map(vote => vote.space.id)
      .filter((v, i, a) => a.indexOf(v) === i);
    const query = `
      SELECT * FROM spaces
      WHERE id IN (?) AND settings IS NOT NULL AND deleted = 0
    `;
    try {
      let spaces = await db.queryAsync(query, [spaceIds]);

      spaces = Object.fromEntries(
        spaces.map(space => [
          space.id,
          formatSpace({
            turboExpiration: space.turbo_expiration,
            ...space
          })
        ])
      );
      // the main query already excludes deleted spaces; this only drops votes
      // whose space was deleted between the two queries, as their space
      // skeleton would violate the non-null Space fields
      votes = votes
        .filter(vote => spaces[vote.space.id])
        .map(vote => ({ ...vote, space: spaces[vote.space.id] }));
    } catch (err: any) {
      capture(err, { args, context, info });
      log.error(`[graphql] votes, ${JSON.stringify(err)}`);
      return Promise.reject(new Error('request failed'));
    }
  }

  if (requestedFields.proposal && votes.length > 0) {
    const proposalIds = votes.map(vote => vote.proposal);
    const query = `
      SELECT
        p.*,
        skins.*,
        p.id AS id,
        spaces.settings,
        spaces.domain as spaceDomain,
        spaces.created as spaceCreated,
        spaces.flagged as spaceFlagged,
        spaces.verified as spaceVerified,
        spaces.turbo_expiration as spaceTurboExpiration,
        spaces.hibernated as spaceHibernated
      FROM proposals p
      INNER JOIN spaces ON spaces.id = p.space
      LEFT JOIN skins ON spaces.id = skins.id
      WHERE spaces.deleted = 0 AND spaces.settings IS NOT NULL AND p.id IN (?)
    `;
    try {
      let proposals = await db.queryAsync(query, [proposalIds]);
      proposals = Object.fromEntries(
        proposals.map(proposal => [proposal.id, formatProposal(proposal)])
      );
      // drop votes whose proposal can not be resolved (hard-deleted proposal
      // whose votes are not yet marked cb = -3), as a null proposal would
      // violate the non-null Proposal field
      votes = votes
        .filter(vote => proposals[vote.proposal])
        .map(vote => ({ ...vote, proposal: proposals[vote.proposal] }));
    } catch (err: any) {
      capture(err, { args, context, info });
      log.error(`[graphql] votes, ${JSON.stringify(err)}`);
      return Promise.reject(new Error('request failed'));
    }
  }

  return votes;
}

export default async function (parent, args, context?, info?) {
  const requestedFields = info ? graphqlFields(info) : {};
  return await serve(JSON.stringify({ args, requestedFields }), query, [
    parent,
    args,
    context,
    info
  ]);
}
