// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('agents', t => {
    t.increments('id').primary();
    t.string('name').notNullable().defaultTo('');
    t.string('user_address').notNullable().index();
    t.string('agent_address').notNullable().unique();
    t.string('agent_name');
    t.text('soul_md').notNullable();
    t.integer('vote_count').unsigned().notNullable().defaultTo(0);
    t.boolean('active').defaultTo(false).index();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('agent_contexts', t => {
    t.increments('id').primary();
    t.integer('agent_id').unsigned().notNullable().references('id').inTable('agents').onDelete('CASCADE');
    t.string('space_id').notNullable();
    t.text('context').notNullable().defaultTo('');
    t.unique(['agent_id', 'space_id']);
  });

  await knex.schema.dropTableIfExists('authorizations');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('agent_contexts');
  await knex.schema.dropTableIfExists('agents');
}
