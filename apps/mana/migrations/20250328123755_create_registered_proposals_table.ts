// This is a workaround for Node v23.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('registered_proposals');
  if (exists) return;

  return knex.schema.createTable('registered_proposals', t => {
    t.string('id').primary();
    t.timestamps(true, true);
    t.string('chainId');
    t.integer('timestamp');
    t.string('strategyAddress');
    t.string('herodotusId');
    t.boolean('processed').defaultTo(false).index();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('registered_proposals');
}
