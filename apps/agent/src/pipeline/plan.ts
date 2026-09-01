import { eq } from 'drizzle-orm';
import {
  getActiveProposals,
  getAuthorizedVoters,
  getVotersWhoVoted,
  Proposal
} from '../clients/hub';
import { CAST_WINDOW, SPACE_IDS } from '../config';
import { contexts, db, jobs, signers } from '../db';

export function isEligible(proposal: Proposal): boolean {
  return proposal.privacy !== 'shutter';
}

export async function plan(now: number): Promise<number> {
  const proposals = (await getActiveProposals(SPACE_IDS)).filter(isEligible);
  if (!proposals.length) return 0;

  const pairs = await db
    .selectDistinct({ address: signers.address, signer: signers.signer })
    .from(signers)
    .innerJoin(contexts, eq(contexts.address, signers.address));
  const voters = await getAuthorizedVoters(pairs);
  if (!voters.length) return 0;

  let created = 0;

  for (const proposal of proposals) {
    const voted = new Set(await getVotersWhoVoted(proposal.id, voters));
    const pending = voters.filter(voter => !voted.has(voter));
    if (!pending.length) continue;

    const inserted = await db
      .insert(jobs)
      .values(
        pending.map(voter => ({
          proposal: proposal.id,
          space: proposal.space.id,
          voter,
          notBefore: proposal.end - CAST_WINDOW,
          proposalEnd: proposal.end,
          proposalType: proposal.type,
          created: now,
          updated: now
        }))
      )
      .onConflictDoNothing()
      .returning({ voter: jobs.voter });

    created += inserted.length;
  }

  return created;
}
