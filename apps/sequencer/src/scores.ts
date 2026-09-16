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
  // Threshold-ElGamal columns: NULL when privacy != 'shutter-elgamal' or
  // before DKG completion. Parse JSON fields and hex-encode the binary mpk
  // so downstream callers see the same shape as actions.ts/getProposal.
  if (typeof proposal.te_config === 'string')
    proposal.te_config = JSON.parse(proposal.te_config);
  if (typeof proposal.te_committee_pks === 'string')
    proposal.te_committee_pks = JSON.parse(proposal.te_committee_pks);
  if (typeof proposal.te_keyper_urls === 'string')
    proposal.te_keyper_urls = JSON.parse(proposal.te_keyper_urls);
  if (typeof proposal.te_aggregate === 'string')
    proposal.te_aggregate = JSON.parse(proposal.te_aggregate);
  if (proposal.te_mpk && Buffer.isBuffer(proposal.te_mpk))
    proposal.te_mpk = `0x${proposal.te_mpk.toString('hex')}`;
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
      // Voting is still open: the tally stays encrypted until close, but the
      // *number* of ballots cast is public (same as Snapshot's classic
      // shielded `shutter` mode, which shows a live vote count while hiding
      // the choices). Keep proposals.votes in sync so the UI doesn't show
      // "0 votes" while ballots are arriving.
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
    log.info(
      `[scores] skipping recalculation space=${proposal.space} proposal=${proposalId} votes=${proposal.votes} scores_updated=${proposal.scores_updated}`
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

/**
 * Threshold-ElGamal tally mirror.
 *
 * Idempotent. Called by ``updateProposalAndVotes`` once the proposal has closed.
 *
 * **This does not tally anything.** It publishes, in Snapshot's own columns, a
 * result the committee established elsewhere:
 *
 *   1. The keypers build the weighted aggregate themselves from the ballot feed
 *      and post it signed to ``POST /api/proposal/:id/te_aggregate``, which the
 *      hub admits only on a quorum of matching digests (``geg.ts``).
 *   2. The tally aggregator solves the discrete log — Lagrange over ``t+1``
 *      DLEQ-verified shares, then BSGS within ``budget × Σ(scaled weights)`` —
 *      and the result publisher posts the totals to ``POST /te_result``, which
 *      the hub stores in ``te_results`` behind a signature check.
 *   3. This function reads that row. No row yet means the committee has not
 *      finished: return ``false``, leave ``scores_state`` pending, and let the
 *      next scheduler tick retry.
 *
 * So ``recoverTally`` is never called here, and BSGS never runs in this process.
 * Exactly one party solves the discrete log; everyone downstream — the hub, this
 * function, and the browser audit in ``ui/helpers/teVerify`` — only *checks* what
 * that party published, which is the cheaper half of the same guarantee.
 *
 * The one piece of arithmetic that is ours is the units: ``te_results`` counts in
 * scaled units multiplied by the budget, ``proposals.scores`` in token units,
 * hence ``total × scale / budget`` below.
 *
 * ``scores_by_strategy`` is intentionally empty: per-voter strategy breakdown
 * leaks individual votes through homomorphic isolation, which is the exact
 * privacy property this mode preserves.
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
  // Totals are stored as decimal strings because they can exceed 2^53, where a
  // JSON number stops being exact. `Number()` here is lossy at that scale and
  // that is accepted: `scores` is a float column and the published figure is a
  // presentation of the tally, not the artifact anyone verifies. The exact
  // integers stay in te_results for an auditor.
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
      // Deliberately empty: a per-strategy breakdown of a private tally would
      // narrow each ballot down to the strategies that produced it.
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
