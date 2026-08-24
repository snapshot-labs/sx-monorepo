import {
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
  table => [primaryKey({ columns: [table.proposal, table.voter] })]
);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
