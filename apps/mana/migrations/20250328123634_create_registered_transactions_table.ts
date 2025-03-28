import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('registered_transactions');
  if (exists) return;

  return knex.schema.createTable('registered_transactions', t => {
    t.increments('id').primary();
    t.timestamps(true, true);
    t.boolean('processed').defaultTo(false).index();
    t.boolean('failed').defaultTo(false).index();
    t.string('network').index();
    t.string('type').index();
    t.string('sender');
    t.string('hash');
    t.json('data');
    t.unique(['sender', 'hash']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('registered_transactions');
}
