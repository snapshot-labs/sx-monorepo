import 'dotenv/config';
import snapshot from '@snapshot-labs/snapshot.js';
import db from '../src/helpers/mysql';
import { getProposal, getVotes, updateProposalScores } from '../src/scores';

// Usage:
//   bunx ts-node scripts/rescore-proposal.ts --proposal <id>            # dry run
//   bunx ts-node scripts/rescore-proposal.ts --proposal <id> --apply    # write
//
// Recomputes a proposal's results with the currently bundled snapshot.js and,
// with --apply, writes scores/scores_by_strategy/scores_total/scores_state +
// scores_updated back to the proposals table.
//
// This reads the votes as already stored (for shutter proposals the choices
// must already be decrypted) and re-tallies using each vote's existing voting
// power. It does not re-fetch voting power and does not read or modify the
// proposal's privacy field, so it is safe to run on closed shutter proposals
// that the normal scoring path refuses to recompute.

async function main() {
  const proposalArg = process.argv.indexOf('--proposal');
  const proposalId =
    proposalArg !== -1 ? process.argv[proposalArg + 1] : process.argv[2];
  const apply = process.argv.includes('--apply');

  if (!proposalId || !proposalId.startsWith('0x')) {
    throw new Error('Missing or invalid --proposal <id>');
  }

  const proposal = await getProposal(proposalId);
  if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);

  if (proposal.state !== 'closed') {
    throw new Error(
      `Proposal is not closed (state: ${proposal.state}); refusing to finalize`
    );
  }

  const votes = await getVotes(proposalId);
  if (!votes) throw new Error(`No votes loaded for ${proposalId}`);

  const allFinal = votes.every(vote => vote.vp_state === 'final');
  if (!allFinal) {
    console.warn(
      'Warning: not all votes have vp_state = final; re-tallying with stored voting power without refreshing it'
    );
  }

  const voting = new snapshot.utils.voting[proposal.type](
    proposal,
    votes,
    proposal.strategies
  );
  const results = {
    scores_state: 'final',
    scores: voting.getScores(),
    scores_by_strategy: voting.getScoresByStrategy(),
    scores_total: voting.getScoresTotal()
  };

  console.log(`Proposal:   ${proposal.id}`);
  console.log(`Space:      ${proposal.space}`);
  console.log(`Type:       ${proposal.type}`);
  console.log(`Votes:      ${votes.length}`);
  console.log(`snapshot.js voting: ${proposal.type}`);
  console.log('');
  console.log('Choice                                   stored -> recomputed');
  proposal.choices.forEach((choice: string, i: number) => {
    console.log(`  ${choice}: ${proposal.scores[i]} -> ${results.scores[i]}`);
  });
  console.log('');
  console.log(
    `scores_total: ${proposal.scores_total} -> ${results.scores_total}`
  );

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write these scores.');
    return;
  }

  await updateProposalScores(proposal, results, votes.length);
  console.log(`\nApplied. Wrote final scores for ${proposal.id}.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.endAsync().then(() => process.exit()));
