// This is a workaround for Node v23.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('authorizations');
  if (exists) return;

  return knex.schema.createTable('authorizations', t => {
    t.increments('id').primary();
    t.string('user_address').notNullable();
    t.string('space_id').notNullable();
    t.string('agent_address').notNullable();
    t.string('agent_name');
    t.text('soul_md').notNullable();
    t.boolean('active').defaultTo(false).index();
    t.timestamps(true, true);
    t.unique(['user_address', 'space_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('authorizations');
}
