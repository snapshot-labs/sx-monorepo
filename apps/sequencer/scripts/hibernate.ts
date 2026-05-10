import 'dotenv/config';
import db from '../src/helpers/mysql';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';

async function main() {
  if (process.argv.length < 2) {
    console.error(`Usage: bunx ts-node scripts/hibernate.ts run|preview`);
    return process.exit(1);
  }

  const [, , action] = process.argv;

  const commands = {
    preview: `SELECT COUNT(id) as count from toHibernate`,
    run: `UPDATE spaces SET hibernated = 1 where spaces.id IN (SELECT id FROM toHibernate)`
  };

  if (!commands[action]) {
    console.error(`First argument should be either "run" or "preview"`);
    return process.exit(1);
  }

  const liveNetworks = Object.values(networks)
    .filter((network: any) => !network.testnet)
    .map((network: any) => network.key);

  const query = `
    WITH toHibernate AS (
      WITH data AS (
        SELECT
        id,
        (SELECT MAX(created) FROM proposals WHERE space = spaces.id LIMIT 1) AS lastProposalEndDate
        FROM spaces
        WHERE hibernated = 0
      )

      SELECT
        id, lastProposalEndDate
        FROM data
        WHERE
        # Filtering out spaces that have not been active in the past year
        FROM_UNIXTIME(lastProposalEndDate) < DATE_SUB(CURRENT_DATE, INTERVAL 1 YEAR)
    )

    ${commands[action]};
  `;

  const results = await db.queryAsync(query, liveNetworks);

  if (action === 'preview') {
    console.log(`Spaces eligible for hibernation: ${results[0].count}`);
  } else {
    console.log(`${results.message}`);
  }
}

(async () => {
  try {
    await main();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
