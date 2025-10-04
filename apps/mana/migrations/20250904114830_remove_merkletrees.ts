// This is a workaround for Node v23.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.dropTable('merkletree_requests').dropTable('merkletrees');
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .createTable('merkletree_requests', t => {
      t.string('id').primary();
      t.timestamps(true, true);
      t.boolean('processed').defaultTo(false).index();
      t.string('root');
    })
    .createTable('merkletrees', t => {
      t.string('id').primary();
      t.timestamps(true, true);
      t.jsonb('tree');
    });
}
