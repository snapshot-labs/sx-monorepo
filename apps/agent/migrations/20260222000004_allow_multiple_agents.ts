// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('agents', t => {
    t.dropUnique(['user_address']);
    t.unique(['agent_address']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('agents', t => {
    t.dropUnique(['agent_address']);
    t.unique(['user_address']);
  });
}
