import snapshot from '@snapshot-labs/snapshot.js';
import { CB } from './constants';
import log from './helpers/log';
import db from './helpers/mysql';
import { getDecryptionKey } from './helpers/shutter';
import { hasStrategyOverride, sha256 } from './helpers/utils';

const scoreAPIUrl = process.env.SCORE_API_URL || 'https://score.snapshot.org';
const FINALIZE_SCORE_SECONDS_DELAY = 60;

export async function getProposal(id: string): Promise<any | undefined> {
  const query = 'SELECT * FROM proposals WHERE id = ? LIMIT 1';
  const [proposal] = await db.queryAsync(query, [id]);
  if (!proposal) return;
  proposal.strategies = JSON.parse(proposal.strategies);
  proposal.plugins = JSON.parse(proposal.plugins);
  proposal.choices = JSON.parse(proposal.choices);
  proposal.scores = JSON.parse(proposal.scores);
  proposal.scores_by_strategy = JSON.parse(proposal.scores_by_strategy);
  proposal.vp_value_by_strategy = JSON.parse(proposal.vp_value_by_strategy);
  let proposalState = 'pending';
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (ts > proposal.start) proposalState = 'active';
  if (ts > proposal.end) proposalState = 'closed';
  proposal.state = proposalState;
  return proposal;
}

export async function getVotes(proposalId: string): Promise<any[] | undefined> {
  const query =
    'SELECT id, choice, voter, vp, vp_by_strategy, vp_state, vp_value FROM votes WHERE proposal = ?';
  const votes = await db.queryAsync(query, [proposalId]);

  return votes.map(vote => {
    vote.choice = JSON.parse(vote.choice);
    vote.vp_by_strategy = JSON.parse(vote.vp_by_strategy);
    vote.balance = vote.vp;
    vote.scores = vote.vp_by_strategy;
    return vote;
  });
}

async function updateVotesVp(
  votes: any[],
  vpState: string,
  proposalId: string
) {
  const votesWithChange = votes.filter(vote => {
    const key1 = sha256(JSON.stringify([vote.balance, vote.scores, vpState]));
    const key2 = sha256(
      JSON.stringify([vote.vp, vote.vp_by_strategy, vote.vp_state])
    );
    return key1 !== key2;
  });
  if (votesWithChange.length === 0) return;

  const max = 200;
  const pages = Math.ceil(votesWithChange.length / max);
  const votesInPages: any = [];
  Array.from(Array(pages)).forEach((x, i) => {
    votesInPages.push(votesWithChange.slice(max * i, max * (i + 1)));
  });

  let i = 0;
  for (const votesInPage of votesInPages) {
    const params: any = [];
    let query = '';
    votesInPage.forEach((vote: any) => {
      query += `UPDATE votes
      SET vp = ?, vp_by_strategy = ?, vp_state = ?, vp_value = ?, cb = ?
      WHERE id = ? AND proposal = ? AND cb != ? LIMIT 1; `;
      params.push(vote.balance);
      params.push(JSON.stringify(vote.scores));
      params.push(vpState);
      params.push(vote.vp_value);
      params.push(CB.PENDING_COMPUTE);
      params.push(vote.id);
      params.push(proposalId);
      params.push(CB.PENDING_DELETE);
    });
    await db.queryAsync(query, params);
    if (i) await snapshot.utils.sleep(200);
    i++;
  }
  log.info(
    `[scores] updated votes vp, ${votesWithChange.length}/${votes.length} on ${proposalId}`
  );
}

export async function updateProposalScores(
  proposal: any,
  scores: any,
  votes: number
) {
  const ts = (Date.now() / 1e3).toFixed();
  const query = `
    UPDATE proposals
    SET scores_state = ?,
    scores = ?,
    scores_by_strategy = ?,
    scores_total = ?,
    scores_updated = ?,
    votes = ?,
    cb = ?
    WHERE id = ? LIMIT 1;
  `;
  await db.queryAsync(query, [
    scores.scores_state,
    JSON.stringify(scores.scores),
    JSON.stringify(scores.scores_by_strategy),
    scores.scores_total,
    ts,
    votes,
    proposal.cb === CB.PENDING_FINAL ? CB.PENDING_COMPUTE : proposal.cb,
    proposal.id
  ]);
}

const pendingRequests = {};

export async function updateProposalAndVotes(
  proposalId: string,
  force = false
) {
  const proposal = await getProposal(proposalId);
  if (!proposal || proposal.state === 'pending') return false;
  if (proposal.scores_state === 'final') return true;

  if (!force && proposal.privacy === 'shutter' && proposal.state === 'closed') {
    await getDecryptionKey(proposal.id);
    return true;
  }

  const ts = Number((Date.now() / 1e3).toFixed());

  // Delay computation of final scores, to allow time for last minute votes to finish
  // up to 1 minute after the end of the proposal
  if (proposal.end <= ts) {
    const secondsSinceEnd = ts - proposal.end;
    await snapshot.utils.sleep(
      Math.max(FINALIZE_SCORE_SECONDS_DELAY - secondsSinceEnd, 0) * 1000
    );
  }

  // Ignore score calculation if proposal have more than 100k votes and scores_updated greater than 5 minute
  if (
    (proposal.votes > 20000 && proposal.scores_updated > ts - 300) ||
    pendingRequests[proposalId]
  ) {
    console.log(
      'ignore score calculation',
      proposal.space,
      proposalId,
      proposal.votes,
      proposal.scores_updated
    );
    return false;
  }
  if (proposal.votes > 20000) pendingRequests[proposalId] = true;

  try {
    // Get votes
    let votes: any = await getVotes(proposalId);
    const isFinal = votes.every(vote => vote.vp_state === 'final');
    let vpState = 'final';

    if (!isFinal) {
      log.info(`[scores] Get scores', ${proposalId}`);

      // Get scores
      const { scores, state } = await snapshot.utils.getScores(
        proposal.space,
        proposal.strategies,
        proposal.network,
        votes.map(vote => vote.voter),
        parseInt(proposal.snapshot),
        scoreAPIUrl,
        { returnValue: 'all' }
      );
      vpState = state;

      // Add vp to votes
      votes = votes.map((vote: any) => {
        vote.scores = proposal.strategies.map(
          (strategy, i) => scores[i][vote.voter] || 0
        );
        vote.balance = vote.scores.reduce((a, b: any) => a + b, 0);
        return vote;
      });
    }

    // Get results
    const voting = new snapshot.utils.voting[proposal.type](
      proposal,
      votes,
      proposal.strategies
    );
    const results = {
      scores_state: proposal.state === 'closed' ? 'final' : 'pending',
      scores: voting.getScores(),
      scores_by_strategy: voting.getScoresByStrategy(),
      scores_total: voting.getScoresTotal()
    };

    // Check if voting power is final
    const withOverride = hasStrategyOverride(proposal.strategies);
    if (vpState === 'final' && withOverride && proposal.state !== 'closed')
      vpState = 'pending';

    // Update votes voting power
    if (!isFinal) await updateVotesVp(votes, vpState, proposalId);

    // Store scores
    await updateProposalScores(proposal, results, votes.length);
    log.info(
      `[scores] Proposal updated ${proposal.id}, ${proposal.space}, ${results.scores_state}, ${votes.length}`
    );

    delete pendingRequests[proposalId];
    return true;
  } catch (err) {
    delete pendingRequests[proposalId];
    throw err;
  }
}
