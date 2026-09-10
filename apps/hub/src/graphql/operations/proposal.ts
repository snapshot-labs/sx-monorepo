import { capture } from '@snapshot-labs/snapshot-sentry';
import { enforceHistoricalEntityBoundary } from '../../helpers/historicalAccess';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { formatProposal } from '../helpers';

export default async function (parent, { id }, context?) {
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
    WHERE p.id = ? AND spaces.deleted = 0 AND spaces.settings IS NOT NULL
    LIMIT 1
  `;
  let proposals;
  try {
    proposals = await db.queryAsync(query, [id]);
  } catch (err: any) {
    log.error(`[graphql] proposal, ${JSON.stringify(err)}`);
    capture(err, { id });
    return Promise.reject(new Error('request failed'));
  }

  const proposal = proposals[0];
  if (!proposal) return null;
  if (
    !enforceHistoricalEntityBoundary(
      proposal.created,
      context?.historicalAccess,
      'proposal'
    )
  ) {
    return null;
  }
  return formatProposal(proposal);
}
