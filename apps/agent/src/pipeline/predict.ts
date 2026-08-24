import { and, eq, lte, or } from 'drizzle-orm';
import {
  getProposals,
  getVoteHistory,
  getVotersWhoVoted,
  Proposal,
  Vote
} from '../clients/hub';
import { predictVote } from '../clients/openrouter';
import {
  CONFIDENCE_LEVELS,
  MAX_ATTEMPTS,
  MIN_CONFIDENCE,
  MIN_HISTORY,
  MODEL,
  PREDICT_BATCH,
  PREDICT_LEASE
} from '../config';
import { SYSTEM_PROMPT } from '../context';
import { db, Job, jobs } from '../db';
import logger from '../logger';
import { buildInstructions, buildProposals, buildVoterHistory } from './prompt';

export function meetsConfidence(confidence: string): boolean {
  const level = CONFIDENCE_LEVELS.indexOf(
    confidence as (typeof CONFIDENCE_LEVELS)[number]
  );

  return level >= CONFIDENCE_LEVELS.indexOf(MIN_CONFIDENCE);
}

function byId(proposals: Proposal[]): Map<string, Proposal> {
  return new Map(proposals.map(proposal => [proposal.id, proposal]));
}

function groupVotes(history: Vote[]): Map<string, Vote[]> {
  const grouped = new Map<string, Vote[]>();

  for (const vote of history) {
    const key = `${vote.voter}:${vote.space.id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), vote]);
  }

  return grouped;
}

async function claim(now: number): Promise<Job[]> {
  return db.transaction(async tx => {
    const claimed = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.status, 'pending'), lte(jobs.notBefore, now)))
      .limit(PREDICT_BATCH)
      .for('update', { skipLocked: true });

    if (!claimed.length) return [];

    await tx
      .update(jobs)
      .set({
        status: 'predicting',
        lockedUntil: now + PREDICT_LEASE,
        updated: now
      })
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
    'prediction failed'
  );

  await db
    .update(jobs)
    .set({
      status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
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

export async function predict(now: number): Promise<number> {
  const claimed = await claim(now);
  if (!claimed.length) return 0;

  const targets = byId(
    await getProposals([...new Set(claimed.map(job => job.proposal))])
  );
  const history = await getVoteHistory(
    [...new Set(claimed.map(job => job.space))],
    [...new Set(claimed.map(job => job.voter))]
  );
  const past = byId(
    await getProposals([...new Set(history.map(vote => vote.proposal.id))])
  );
  const votesByVoter = groupVotes(history);
  const votedByProposal = await loadVotedByProposal(claimed);

  const proposalsText = new Map<string, string>();
  let spent = 0;

  for (const job of claimed) {
    const target = targets.get(job.proposal);
    if (!target) {
      await skip(job, 'proposal_gone', now);
      continue;
    }

    if (votedByProposal.get(job.proposal)?.has(job.voter)) {
      await skip(job, 'already_voted', now);
      continue;
    }

    const votes = votesByVoter.get(`${job.voter}:${job.space}`) ?? [];
    if (votes.length < MIN_HISTORY) {
      await skip(job, 'thin_history', now);
      continue;
    }

    let text = proposalsText.get(job.proposal);
    if (!text) {
      const spacePast = [...past.values()].filter(
        proposal =>
          proposal.space.id === job.space && proposal.id !== job.proposal
      );

      text = buildProposals(target, spacePast);
      proposalsText.set(job.proposal, text);
    }

    try {
      const { prediction, cost } = await predictVote({
        system: SYSTEM_PROMPT,
        proposals: text,
        history: buildVoterHistory(job.voter, votes, past),
        instructions: buildInstructions(),
        choices: target.choices
      });

      spent += cost;

      // Snapshot stores a vote as the option's position, counting from 1.
      const choice = target.choices.indexOf(prediction.choice) + 1;
      if (choice === 0) {
        await skip(job, 'unknown_choice', now);
        continue;
      }

      const passed = meetsConfidence(prediction.confidence);

      await db
        .update(jobs)
        .set({
          choice,
          confidence: prediction.confidence,
          reasoning: prediction.reasoning,
          model: MODEL,
          cost: cost.toString(),
          status: passed ? 'predicted' : 'skipped',
          skipReason: passed ? null : 'low_confidence',
          lockedUntil: null,
          updated: now
        })
        .where(and(eq(jobs.proposal, job.proposal), eq(jobs.voter, job.voter)));
    } catch (err) {
      await fail(job, now, err);
    }
  }

  if (spent > 0) logger.info({ spent, jobs: claimed.length }, 'model spend');

  return claimed.length;
}
