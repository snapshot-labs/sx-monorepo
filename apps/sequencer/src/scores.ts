import snapshot from '@snapshot-labs/snapshot.js';
import { CB } from './constants';
import log from './helpers/log';
import db from './helpers/mysql';
import { getDecryptionKey } from './helpers/shutter';
import {
  aggregateBallots,
  aggregateToJson,
  decodeCommitteePks,
  ensureCurvesInit,
  recoverTeTally,
  shareRowsToShares,
  triggerKeypers
} from './helpers/te';
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
 * Threshold-ElGamal tally worker.
 *
 * Idempotent. Called by ``updateProposalAndVotes`` once the proposal has
 * closed. Each invocation:
 *
 *   1. Recomputes the vp-weighted homomorphic aggregate from the verified
 *      ballots in the votes table and persists it as ``proposals.te_aggregate``.
 *      Hub serves this JSON to keypers via ``GET /api/proposal/:id/te_aggregate``.
 *   2. Pings every keyper URL so they re-pull the aggregate and submit
 *      shares (no-op for keypers that already submitted: hub side is
 *      ``INSERT IGNORE`` on PK ``(proposal, keyper, candidate)``).
 *   3. Reads back the share rows; if any candidate still has fewer than
 *      ``t+1`` valid shares, returns ``false`` and leaves ``scores_state``
 *      pending — the next scheduler tick will retry.
 *   4. Otherwise calls ``recoverTally`` (Lagrange + BSGS), writes the
 *      integer per-candidate totals into ``proposals.scores`` and marks
 *      the proposal final.
 *
 * ``scores_by_strategy`` is intentionally empty: per-voter strategy
 * breakdown leaks individual votes through homomorphic isolation, which
 * is the exact privacy property this mode preserves.
 */
async function runShutterElgamalTally(proposal: any): Promise<boolean> {
  if (!proposal.te_config) {
    log.warn(`[te-tally] ${proposal.id} missing te_config`);
    return false;
  }
  const numCandidates: number = proposal.te_config.numCandidates;
  const threshold: number = proposal.te_threshold_t;
  const keyperUrls: string[] = proposal.te_keyper_urls || [];
  const committeePks: string[] = proposal.te_committee_pks || [];
  if (
    !proposal.te_mpk ||
    keyperUrls.length === 0 ||
    committeePks.length === 0
  ) {
    log.warn(`[te-tally] ${proposal.id} DKG not finalised`);
    return false;
  }

  // Pull every persisted ballot. Each row in ``votes.choice`` has been
  // ``verifyBallot``-validated at write time (see helpers/te.ts), so we
  // do not re-verify here; the homomorphic sum is over trusted inputs.
  const rawVotes = await db.queryAsync(
    'SELECT choice, vp FROM votes WHERE proposal = ? AND cb != ?',
    [proposal.id, CB.PENDING_DELETE]
  );
  if (rawVotes.length === 0) {
    // No votes: write empty tally and finalise. recoverTally would throw
    // on zero candidates of zero ballots, so short-circuit.
    const zeroScores = new Array(numCandidates).fill(0);
    await updateProposalScores(
      proposal,
      {
        scores_state: 'final',
        scores: zeroScores,
        scores_by_strategy: [],
        scores_total: 0
      },
      0
    );
    return true;
  }

  let aggregate;
  try {
    // aggregateBallots uses the BLST curve layer; the ingest path inits it
    // lazily, but the scheduler may aggregate in a process that has not yet
    // verified a ballot, so make sure the curves are ready here too.
    await ensureCurvesInit();
    aggregate = aggregateBallots(numCandidates, rawVotes);
  } catch (err: any) {
    log.warn(`[te-tally] ${proposal.id} aggregate failed: ${err.message}`);
    return false;
  }
  const aggregateJson = aggregateToJson(proposal.id, aggregate);
  await db.queryAsync(
    'UPDATE proposals SET te_aggregate = ? WHERE id = ? LIMIT 1',
    [JSON.stringify(aggregateJson), proposal.id]
  );

  // Trigger keypers to compute and submit their decryption shares. This call
  // blocks until all reachable keypers respond — the keyper handler is
  // synchronous end-to-end, submitting shares to the hub before returning.
  // By the time this resolves, all reachable keypers have already submitted.
  // If a keyper is unreachable, the error is swallowed and the share-count
  // gate below decides whether t+1 shares are available from the others.
  // If not in this tick, the next one will trigger keypers again.
  await triggerKeypers(proposal.id, keyperUrls);

  // Read shares. Each (keyper, candidate) row is one PartialDecryption.
  const shareRows = await db.queryAsync(
    'SELECT keyper_index, candidate, sigma, proof_e, proof_z FROM te_decryption_shares WHERE proposal_id = ?',
    [proposal.id]
  );
  const { shares, warnings } = shareRowsToShares(shareRows, numCandidates);
  for (const w of warnings) log.warn(`[te-tally] ${proposal.id} ${w}`);

  const need = threshold + 1;
  for (let j = 0; j < numCandidates; j++) {
    if (shares[j].length < need) {
      log.info(
        `[te-tally] ${proposal.id} candidate ${j} has ${shares[j].length}/${need} shares; waiting`
      );
      return false;
    }
  }

  // For weighted proposals, each ballot encodes proportional weights that sum
  // to budget (e.g. [60, 40] out of 100). The aggregate for candidate j is
  // Σ(vp_i × votes_i[j]) = budget × Σ(vp_i × fraction_i_j), so the BSGS
  // upper bound must be scaled by budget. For single-choice (budget=1) this
  // is a no-op.
  const budget = BigInt(proposal.te_config.budget ?? 1);
  let totalVp = 0n;
  for (const v of rawVotes) totalVp += BigInt(Math.round(v.vp));
  const upperBound = totalVp > 0n ? budget * totalVp : 1n;

  let scores: bigint[];
  try {
    const committeePKs = decodeCommitteePks(committeePks);
    scores = await recoverTeTally(
      proposal.id,
      aggregate,
      shares,
      threshold,
      committeePKs,
      upperBound
    );
  } catch (err: any) {
    log.warn(`[te-tally] ${proposal.id} recover failed: ${err.message}`);
    return false;
  }

  // Divide by budget to recover the actual VP-weighted tally. For
  // single-choice (budget=1) this divides by 1 — no change.
  const budgetN = Number(budget);
  const numericScores = scores.map(s => Number(s) / budgetN);
  const total = numericScores.reduce((a, b) => a + b, 0);
  await updateProposalScores(
    proposal,
    {
      scores_state: 'final',
      scores: numericScores,
      scores_by_strategy: [],
      scores_total: total
    },
    rawVotes.length
  );
  log.info(
    `[te-tally] ${proposal.id} finalised; scores=${JSON.stringify(numericScores)}`
  );
  return true;
}
