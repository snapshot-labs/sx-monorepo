import { and, eq } from 'drizzle-orm';
import { db, jobs } from '../db';
import logger from '../logger';

const BATCH_SIZE = 25;

export async function cast(now: number): Promise<number> {
  return db.transaction(async tx => {
    const claimed = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'predicted'))
      .limit(BATCH_SIZE)
      .for('update', { skipLocked: true });

    for (const job of claimed) {
      logger.info(
        {
          proposal: job.proposal,
          voter: job.voter,
          choice: job.choice,
          confidence: job.confidence
        },
        'dry run, would cast vote'
      );

      await tx
        .update(jobs)
        .set({ status: 'skipped', skipReason: 'dry_run', updated: now })
        .where(and(eq(jobs.proposal, job.proposal), eq(jobs.voter, job.voter)));
    }

    return claimed.length;
  });
}
