import {
  getActiveProposals,
  getOptedInVoters,
  getVotersWhoVoted,
  Proposal
} from '../clients/hub';
import { AGENT_SIGNER_ADDRESS, CAST_WINDOW, SPACE_IDS } from '../config';
import { db, jobs } from '../db';

export function isEligible(proposal: Proposal): boolean {
  return proposal.privacy !== 'shutter';
}

export async function plan(now: number): Promise<number> {
  const proposals = (await getActiveProposals(SPACE_IDS)).filter(isEligible);
  if (!proposals.length) return 0;

  const voters = await getOptedInVoters(AGENT_SIGNER_ADDRESS);
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
