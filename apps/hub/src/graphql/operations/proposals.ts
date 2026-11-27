import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatProposal } from '../helpers';

// MySQL's default InnoDB stopwords of 1 or 2 characters. The ngram parser
// (pairs of characters) drops every pair that contains one, both when indexing
// and when parsing the search string.
const SHORT_STOPWORDS =
  'a i an as at be by de en in is it la of on or to'.split(' ');

function isIndexed(word: string): boolean {
  const chars = [...word];
  // The ngram index does not match characters outside the Basic Multilingual Plane
  if (chars.some(char => char.codePointAt(0)! > 0xffff)) return false;
  for (let i = 0; i < chars.length - 1; i++) {
    const pair = chars[i] + chars[i + 1];
    if (!SHORT_STOPWORDS.some(stopword => pair.includes(stopword))) return true;
  }
  return false;
}

// Today's title scan is the fastest when it stops early (a common word, a
// small space). Past this, a rare word is found through the FULLTEXT index.
const TITLE_SCAN_TIMEOUT_MS = 200;

/**
 * The MATCH search string that narrows a title_contains search through the
 * FULLTEXT index without changing its results, or null when the index cannot
 * find every match and only the LIKE scan may run. Every word the index can
 * find must be present, which is always true of a title containing the term;
 * the LIKE keeps results exact.
 */
export function titleMatchQuery(term: string): string | null {
  if (!/^[\p{L}\p{N}\s]+$/u.test(term)) return null;
  const words = term
    .split(/\s+/)
    .filter(isIndexed)
    // The longest words narrow enough; more only make the FULLTEXT query heavier
    .sort((a, b) => [...b].length - [...a].length)
    .slice(0, 3);
  return words.length ? words.map(word => `+"${word}"`).join(' ') : null;
}

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'proposals');

  const fields = {
    id: 'string',
    ipfs: 'string',
    space: 'string',
    author: ['evmAddress', 'starknetAddress'],
    network: 'string',
    created: 'number',
    updated: 'number',
    app: 'string',
    start: 'number',
    end: 'number',
    type: 'string',
    scores_state: 'string',
    votes: 'number',
    scores_total_value: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'p', where);
  let queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  const ts = parseInt((Date.now() / 1e3).toFixed());
  const state = where.state || null;
  if (state === 'pending') {
    queryStr += 'AND p.start > ? ';
    params.push(ts);
  } else if (state === 'active') {
    queryStr += 'AND p.start < ? AND p.end > ? ';
    params.push(ts, ts);
  } else if (state === 'closed') {
    queryStr += 'AND p.end < ? ';
    params.push(ts);
  }

  let searchSql = '';
  let titleMatch: string | null = null;
  if (where.title_contains) {
    const term = where.title_contains.toLowerCase();
    searchSql = 'AND LOWER(p.title) LIKE ?';
    params.push(`%${term}%`);
    titleMatch = titleMatchQuery(term);
  }

  if (where.strategies_contains) {
    searchSql += ' AND p.strategies LIKE ?';
    params.push(`%${where.strategies_contains}%`);
  }

  if (where.plugins_contains) {
    searchSql += ' AND p.plugins LIKE ?';
    params.push(`%${where.plugins_contains}%`);
  }

  if (where.validation) {
    searchSql += ' AND p.validation LIKE ?';
    params.push(`%"name": "${where.validation}"%`);
  }

  if (where.space_verified) {
    searchSql += ' AND spaces.verified = 1';
  }

  if (where.flagged === true) {
    searchSql += ' AND p.flagged > 0';
  }

  if (where.flagged === false) {
    searchSql += ' AND p.flagged = 0';
  }

  if (where?.labels_in?.length) {
    searchSql += ' AND JSON_CONTAINS(p.labels, ?)';
    params.push(JSON.stringify(where.labels_in));
  }

  const orderByFields = Object.entries(fields)
    .filter(field => field[1] === 'number')
    .map(field => field[0]);

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!orderByFields.includes(orderBy)) orderBy = 'created';
  orderBy = `p.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const query = (hint = '', matchSql = '') => `
    SELECT ${hint}
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
    WHERE p.space NOT IN (SELECT id FROM spaces WHERE deleted = 1) ${queryStr} ${searchSql} ${matchSql}
    ORDER BY ${orderBy} ${orderDirection}, p.id ASC LIMIT ?, ?
  `;
  const values = [...params, skip, first];
  try {
    // All three queries return the same rows, whichever one answers
    const proposals = titleMatch
      ? await db
          .queryAsync(
            query(`/*+ MAX_EXECUTION_TIME(${TITLE_SCAN_TIMEOUT_MS}) */`),
            values
          )
          .catch(() =>
            db.queryAsync(
              query('', 'AND MATCH(p.title_lower) AGAINST (? IN BOOLEAN MODE)'),
              [...params, titleMatch, skip, first]
            )
          )
          // Without the index (not deployed yet, or a query it cannot run),
          // search as before
          .catch(() => db.queryAsync(query(), values))
      : await db.queryAsync(query(), values);
    return proposals.map(proposal => formatProposal(proposal));
  } catch (err: any) {
    log.error(`[graphql] proposals, ${JSON.stringify(err)}`);
    capture(err, { args });
    return Promise.reject(new Error('request failed'));
  }
}
