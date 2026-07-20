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

  // A single-element proposal_in is the same filter as proposal; collapse it so
  // it takes the indexed path below. An empty array still means match-nothing.
  if (
    where.proposal === undefined &&
    Array.isArray(where.proposal_in) &&
    where.proposal_in.length === 1 &&
    typeof where.proposal_in[0] === 'string'
  ) {
    where.proposal = where.proposal_in[0];
    delete where.proposal_in;
  }

  // Constrain space so a single-proposal filter can seek the composite index
  // (space, proposal, created, id) rather than scan votes ordered by created.
  if (
    typeof where.proposal === 'string' &&
    where.space === undefined &&
    where.space_in === undefined
  ) {
    try {
      const proposalRows = await db.queryAsync(
        'SELECT space FROM proposals WHERE id = ? LIMIT 1',
        [where.proposal]
      );
      // Proposal doesn't exist: no space to scope by and thus no votes to
      // return. Skip the votes query entirely instead of falling through to the
      // un-indexed slow path.
      if (proposalRows.length === 0) return [];
      where.space = proposalRows[0].space;
    } catch (err: any) {
      // Fail fast: a swallowed lookup error would leave space unset and fall
      // through to the un-scoped, un-hinted scan this path exists to avoid.
      capture(err, { args, context, info });
      log.error(`[graphql] votes, ${JSON.stringify(err)}`);
      return Promise.reject(new Error('request failed'));
    }
  }

  const whereQuery = buildWhereQuery(fields, 'v', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created', 'vp'].includes(orderBy)) orderBy = 'created';
  orderBy = `v.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let votes: any[] = [];

  // Force the composite index; for large spaces the optimizer otherwise picks a
  // (space, created) index and scans millions of rows until the LIMIT is filled.
  // Skip the hint when a more selective predicate is present (id is unique,
  // voter is the primary-key prefix): forcing the index would turn those point
  // lookups into a scan of the proposal's entire vote range.
  const hasSelectiveFilter =
    where.id !== undefined ||
    where.id_in !== undefined ||
    where.ipfs !== undefined ||
    where.ipfs_in !== undefined ||
    where.voter !== undefined ||
    where.voter_in !== undefined;
  const forceProposalIndex =
    !hasSelectiveFilter &&
    typeof where.proposal === 'string' &&
    typeof where.space === 'string' &&
    orderBy === 'v.created';
  const indexHint = forceProposalIndex
    ? 'FORCE INDEX (idx_votes_on_space_proposal_created_id)'
    : '';

  // Match the id tie-break to the primary sort direction. The second sort field
  // only breaks ties between equal-value rows, so its direction has no effect on
  // correctness. On the proposal-scoped path it also turns the composite
  // (space, proposal, created, id) index into a pure (backward) scan instead of a
  // filesort.
  const query = `
    SELECT v.* FROM votes v ${indexHint}
    WHERE 1 = 1 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection}, v.id ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    votes = await db.queryAsync(query, params);
    // TODO: we need settings in the vote as its being passed to formatSpace inside formatVote, Maybe we dont need to do this?
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
      votes = votes.map(vote => {
        if (spaces[vote.space.id])
          return { ...vote, space: spaces[vote.space.id] };
        return vote;
      });
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
        spaces.flagged as spaceFlagged,
        spaces.verified as spaceVerified,
        spaces.turbo_expiration as spaceTurboExpiration,
        spaces.hibernated as spaceHibernated
      FROM proposals p
      INNER JOIN spaces ON spaces.id = p.space
      LEFT JOIN skins ON spaces.id = skins.id
      WHERE spaces.settings IS NOT NULL AND p.id IN (?)
    `;
    try {
      let proposals = await db.queryAsync(query, [proposalIds]);
      proposals = Object.fromEntries(
        proposals.map(proposal => [proposal.id, formatProposal(proposal)])
      );
      votes = votes.map(vote => {
        vote.proposal = proposals[vote.proposal];
        return vote;
      });
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
