// This is a workaround for Node v23.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('apegas_proposals');
  if (exists) return;

  return knex.schema.createTable('apegas_proposals', t => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.timestamps(true, true);
    t.integer('chainId');
    t.string('viewId');
    t.integer('snapshot');
    t.string('herodotusId');
    t.boolean('processed').defaultTo(false).index();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('apegas_proposals');
}
