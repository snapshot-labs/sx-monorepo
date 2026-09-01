import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  varchar
} from 'drizzle-orm/pg-core';

export const jobStatus = pgEnum('job_status', [
  'pending',
  'predicting',
  'predicted',
  'casting',
  'cast',
  'skipped',
  'failed'
]);

export const jobs = pgTable(
  'jobs',
  {
    proposal: varchar('proposal', { length: 66 }).notNull(),
    space: varchar('space', { length: 64 }).notNull(),
    voter: varchar('voter', { length: 100 }).notNull(),
    status: jobStatus('status').notNull().default('pending'),
    choice: integer('choice'),
    confidence: varchar('confidence', { length: 8 }),
    reasoning: text('reasoning'),
    model: varchar('model', { length: 64 }),
    cost: numeric('cost', { precision: 10, scale: 6 }),
    skipReason: varchar('skip_reason', { length: 64 }),
    attempts: smallint('attempts').notNull().default(0),
    /** Earliest timestamp at which the vote may be cast. */
    notBefore: integer('not_before').notNull(),
    proposalEnd: integer('proposal_end').notNull().default(0),
    proposalType: varchar('proposal_type', { length: 24 })
      .notNull()
      .default(''),
    lockedUntil: integer('locked_until'),
    /** Sequencer message id, the receipt that this job actually voted. */
    voteId: varchar('vote_id', { length: 66 }),
    created: integer('created').notNull(),
    updated: integer('updated').notNull()
  },
  table => [
    primaryKey({ columns: [table.proposal, table.voter] }),
    index('jobs_status_proposal_end_idx').on(table.status, table.proposalEnd)
  ]
);

export const contexts = pgTable(
  'contexts',
  {
    address: varchar('address', { length: 100 }).notNull(),
    space: varchar('space', { length: 64 }).notNull(),
    context: text('context').notNull(),
    created: integer('created').notNull(),
    updated: integer('updated').notNull()
  },
  table => [primaryKey({ columns: [table.address, table.space] })]
);

export const signers = pgTable('signers', {
  address: varchar('address', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 36 }).notNull(),
  signer: varchar('signer', { length: 42 }).notNull(),
  created: integer('created').notNull()
});

export type Context = typeof contexts.$inferSelect;
export type Signer = typeof signers.$inferSelect;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
