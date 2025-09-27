// This is a workaround for Node v23.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('apegas_proposals', t => {
    t.unique(['chainId', 'viewId', 'snapshot']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('apegas_proposals', t => {
    t.dropUnique(['chainId', 'viewId', 'snapshot']);
  });
}
