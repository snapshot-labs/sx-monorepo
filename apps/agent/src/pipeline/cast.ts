import { and, asc, eq, or } from 'drizzle-orm';
import { getOptedInVoters, getVotersWhoVoted } from '../clients/hub';
import {
  AGENT_SIGNER_ADDRESS,
  castVote,
  isFinalError
} from '../clients/sequencer';
import {
  CAST_BATCH,
  CAST_GAP,
  CAST_LEASE,
  DRY_RUN,
  MAX_ATTEMPTS,
  REASON_LIMIT
} from '../config';
import { db, Job, jobs } from '../db';
import logger from '../logger';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function claim(now: number): Promise<Job[]> {
  return db.transaction(async tx => {
    const claimed = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'predicted'))
      .orderBy(asc(jobs.proposalEnd))
      .limit(CAST_BATCH)
      .for('update', { skipLocked: true });

    if (!claimed.length) return [];

    await tx
      .update(jobs)
      .set({ status: 'casting', lockedUntil: now + CAST_LEASE, updated: now })
      .where(
        or(
          ...claimed.map(job =>
            and(eq(jobs.proposal, job.proposal), eq(jobs.voter, job.voter))
          )
        )
      );

    return claimed;
  });
}

async function skip(job: Job, reason: string, now: number): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: 'skipped',
      skipReason: reason,
      lockedUntil: null,
      updated: now
    })
    .where(and(eq(jobs.proposal, job.proposal), eq(jobs.voter, job.voter)));
}

async function fail(job: Job, now: number, err: unknown): Promise<void> {
  const attempts = job.attempts + 1;

  logger.error(
    { err, proposal: job.proposal, voter: job.voter, attempts },
    'cast failed'
  );

  await db
    .update(jobs)
    .set({
      status: attempts >= MAX_ATTEMPTS ? 'failed' : 'predicted',
      attempts,
      lockedUntil: null,
      updated: now
    })
    .where(and(eq(jobs.proposal, job.proposal), eq(jobs.voter, job.voter)));
}

async function loadVotedByProposal(
  claimed: Job[]
): Promise<Map<string, Set<string>>> {
  const byProposal = new Map<string, Set<string>>();

  for (const proposal of new Set(claimed.map(job => job.proposal))) {
    const voters = claimed
      .filter(job => job.proposal === proposal)
      .map(job => job.voter);

    byProposal.set(
      proposal,
      new Set(await getVotersWhoVoted(proposal, voters))
    );
  }

  return byProposal;
}

export async function cast(now: number): Promise<number> {
  const claimed = await claim(now);
  if (!claimed.length) return 0;

  const votedByProposal = await loadVotedByProposal(claimed);
  const authorized = new Set(await getOptedInVoters(AGENT_SIGNER_ADDRESS));

  let sent = 0;

  for (const job of claimed) {
    if (votedByProposal.get(job.proposal)?.has(job.voter)) {
      await skip(job, 'already_voted', now);
      continue;
    }

    if (job.proposalEnd <= now) {
      await skip(job, 'proposal_closed', now);
      continue;
    }

    if (!authorized.has(job.voter)) {
      await skip(job, 'alias_expired', now);
      continue;
    }

    if (!job.choice) {
      await skip(job, 'no_choice', now);
      continue;
    }

    if (DRY_RUN) {
      logger.info(
        {
          proposal: job.proposal,
          voter: job.voter,
          choice: job.choice,
          confidence: job.confidence
        },
        'dry run, would cast vote'
      );

      await skip(job, 'dry_run', now);
      continue;
    }

    if (sent > 0) await sleep(CAST_GAP);

    try {
      const voteId = await castVote({
        from: job.voter,
        space: job.space,
        proposal: job.proposal,
        type: job.proposalType,
        choice: job.choice,
        reason: (job.reasoning ?? '').slice(0, REASON_LIMIT)
      });

      sent++;

      logger.info(
        {
          proposal: job.proposal,
          voter: job.voter,
          choice: job.choice,
          voteId
        },
        'vote cast'
      );

      await db
        .update(jobs)
        .set({ status: 'cast', voteId, lockedUntil: null, updated: now })
        .where(and(eq(jobs.proposal, job.proposal), eq(jobs.voter, job.voter)));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (isFinalError(message)) {
        logger.warn(
          { proposal: job.proposal, voter: job.voter, message },
          'sequencer turned the vote down'
        );

        await skip(job, 'rejected', now);
        continue;
      }

      await fail(job, now, err);
    }
  }

  return claimed.length;
}
