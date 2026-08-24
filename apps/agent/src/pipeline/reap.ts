import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { MAX_ATTEMPTS } from '../config';
import { db, jobs } from '../db';

async function releaseStale(now: number): Promise<number> {
  const released = await db
    .update(jobs)
    .set({
      status: sql`case when ${jobs.attempts} + 1 >= ${MAX_ATTEMPTS} then 'failed'::job_status else 'pending'::job_status end`,
      attempts: sql`${jobs.attempts} + 1`,
      lockedUntil: null,
      updated: now
    })
    .where(and(eq(jobs.status, 'predicting'), lt(jobs.lockedUntil, now)))
    .returning({ voter: jobs.voter });

  return released.length;
}

async function expireClosed(now: number): Promise<number> {
  const expired = await db
    .update(jobs)
    .set({
      status: 'skipped',
      skipReason: 'proposal_closed',
      lockedUntil: null,
      updated: now
    })
    .where(
      and(
        inArray(jobs.status, ['pending', 'predicting', 'predicted']),
        lt(jobs.proposalEnd, now)
      )
    )
    .returning({ voter: jobs.voter });

  return expired.length;
}

export async function reap(now: number): Promise<number> {
  const released = await releaseStale(now);
  const expired = await expireClosed(now);

  return released + expired;
}
