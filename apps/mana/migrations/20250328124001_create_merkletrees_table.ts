import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('merkletrees');
  if (exists) return;

  return knex.schema.createTable('merkletrees', t => {
    t.string('id').primary();
    t.timestamps(true, true);
    t.jsonb('tree');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('merkletrees');
}
