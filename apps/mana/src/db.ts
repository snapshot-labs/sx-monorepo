import knex from './knex';

export const REGISTERED_TRANSACTIONS = 'registered_transactions';
export const REGISTERED_PROPOSALS = 'registered_proposals';

export async function createTables() {
  const registeredTransactionsTableExists = await knex.schema.hasTable(REGISTERED_TRANSACTIONS);
  const registeredProposalsTableExists = await knex.schema.hasTable(REGISTERED_PROPOSALS);

  if (registeredTransactionsTableExists) await knex.schema.dropTable(REGISTERED_TRANSACTIONS);
  if (registeredProposalsTableExists) await knex.schema.dropTable(REGISTERED_PROPOSALS);

  await knex.schema.createTable(REGISTERED_TRANSACTIONS, t => {
    t.increments('id').primary();
    t.timestamps(true, true);
    t.boolean('processed').defaultTo(false).index();
    t.boolean('failed').defaultTo(false).index();
    t.string('network').index();
    t.string('type').index();
    t.string('hash');
    t.json('data');
  });

  await knex.schema.createTable(REGISTERED_PROPOSALS, t => {
    t.string('id').primary();
    t.timestamps(true, true);
  });
}

export async function registerTransaction(network: string, type: string, hash: string, data: any) {
  return knex(REGISTERED_TRANSACTIONS).insert({
    network,
    type,
    hash,
    data
  });
}

export async function getTransactionsToProcess() {
  return knex(REGISTERED_TRANSACTIONS).select('*').where({ processed: false });
}

export async function markTransactionProcessed(id: number, { failed = false } = {}) {
  return knex(REGISTERED_TRANSACTIONS)
    .update({ updated_at: knex.fn.now(), processed: true, failed })
    .where({ id });
}

export async function markOldTransactionsAsProcessed() {
  return knex(REGISTERED_TRANSACTIONS)
    .update({ updated_at: knex.fn.now(), processed: true, failed: true })
    .whereRaw("created_at < now() - interval '1 day'");
}

export async function registerProposal(id: string) {
  return knex(REGISTERED_PROPOSALS).insert({ id });
}

export async function getProposal(id: string) {
  return knex(REGISTERED_PROPOSALS).select('*').where({ id }).first();
}
