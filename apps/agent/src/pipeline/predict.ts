import { and, eq, lte } from 'drizzle-orm';
import { db, jobs } from '../db';

const BATCH_SIZE = 50;

type Prediction = {
  choice: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
};

function predictVote(): Prediction {
  return {
    choice: 1,
    confidence: 'low',
    reasoning: 'hardcoded prediction, no model call yet'
  };
}

export async function predict(now: number): Promise<number> {
  return db.transaction(async tx => {
    const claimed = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.status, 'pending'), lte(jobs.notBefore, now)))
      .limit(BATCH_SIZE)
      .for('update', { skipLocked: true });

    for (const job of claimed) {
      const prediction = predictVote();

      await tx
        .update(jobs)
        .set({ ...prediction, status: 'predicted', updated: now })
        .where(and(eq(jobs.proposal, job.proposal), eq(jobs.voter, job.voter)));
    }

    return claimed.length;
  });
}
