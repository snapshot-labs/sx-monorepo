import snapshot from '@snapshot-labs/snapshot.js';
import { CB } from './constants';
import log from './helpers/log';
import db from './helpers/mysql';
import { getDecryptionKey } from './helpers/shutter';
import { hasStrategyOverride, sha256 } from './helpers/utils';

const scoreAPIUrl = process.env.SCORE_API_URL || 'https://score.snapshot.org';
const FINALIZE_SCORE_SECONDS_DELAY = 60;

async function getProposal(id: string): Promise<any | undefined> {
  const query = 'SELECT * FROM proposals WHERE id = ? LIMIT 1';
  const [proposal] = await db.queryAsync(query, [id]);
  if (!proposal) return;
  proposal.strategies = JSON.parse(proposal.strategies);
  proposal.plugins = JSON.parse(proposal.plugins);
  proposal.choices = JSON.parse(proposal.choices);
  proposal.scores = JSON.parse(proposal.scores);
  proposal.scores_by_strategy = JSON.parse(proposal.scores_by_strategy);
  proposal.vp_value_by_strategy = JSON.parse(proposal.vp_value_by_strategy);
  // Private-voting columns (NULL on public proposals and before key generation
  // finishes). Parsed the same way as `getProposal` in actions.ts.
  if (typeof proposal.te_config === 'string') {
    proposal.te_config = JSON.parse(proposal.te_config);
  }
  let proposalState = 'pending';
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (ts > proposal.start) proposalState = 'active';
  if (ts > proposal.end) proposalState = 'closed';
  proposal.state = proposalState;
  return proposal;
}

async function getVotes(proposalId: string): Promise<any[] | undefined> {
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

async function updateProposalScores(proposal: any, scores: any, votes: number) {
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

  if (proposal.privacy === 'shutter-elgamal') {
    if (proposal.state !== 'closed') {
      // While voting is open only the vote count is updated; it is public, as
      // in `shutter` mode.
      const [{ n }] = await db.queryAsync(
        'SELECT COUNT(*) AS n FROM votes WHERE proposal = ?',
        [proposal.id]
      );
      await db.queryAsync(
        'UPDATE proposals SET votes = ? WHERE id = ? LIMIT 1',
        [n, proposal.id]
      );
      return true;
    }
    const finalised = await runShutterElgamalTally(proposal);
    return finalised;
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
    if (vpState === 'final' && withOverride && proposal.state !== 'closed') {
      vpState = 'pending';
    }

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

/**
 * Copies the committee's published result into the proposal's scores. It does
 * not compute a tally: the keypers aggregate the ballots, the coordinator
 * decrypts the total and publishes it to the hub's `te_results` table, and this
 * reads that row. Returns `false` if there is no row yet, so the scheduler
 * retries. Idempotent.
 *
 * `te_results` totals are in scaled units times the budget, so scores are
 * `total × scale / budget`. `scores_by_strategy` is left empty because a
 * per-strategy breakdown would reveal information about individual ballots.
 */
async function runShutterElgamalTally(proposal: any): Promise<boolean> {
  const rows = await db.queryAsync(
    'SELECT totals_json FROM te_results WHERE proposal_id = ? LIMIT 1',
    [proposal.id]
  );
  if (!rows[0]) return false;

  let totals: string[];
  try {
    totals = JSON.parse(rows[0].totals_json);
  } catch (err: any) {
    log.warn(`[te-tally] ${proposal.id} unreadable result: ${err.message}`);
    return false;
  }

  const budget = Number(proposal.te_config?.budget ?? 1);
  // Totals are decimal strings because they can exceed 2^53. `Number()` loses
  // precision there, which is fine for the float `scores` column; the exact
  // values stay in te_results.
  const scale = Number(proposal.te_config?.scale ?? 1);
  const numericScores = totals.map(t => (Number(t) * scale) / budget);
  const total = numericScores.reduce((a, b) => a + b, 0);

  const [{ n }] = await db.queryAsync(
    'SELECT COUNT(*) AS n FROM votes WHERE proposal = ?',
    [proposal.id]
  );

  await updateProposalScores(
    proposal,
    {
      scores_state: 'final',
      scores: numericScores,
      scores_by_strategy: [],
      scores_total: total
    },
    n
  );
  log.info(
    `[te-tally] ${proposal.id} mirrored published result; scores=${JSON.stringify(numericScores)}`
  );
  return true;
}
