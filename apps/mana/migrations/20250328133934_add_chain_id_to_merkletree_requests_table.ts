import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('merkletree_requests', table => {
    table.string('chainId');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('merkletree_requests', table => {
    table.dropColumn('chainId');
  });
}
