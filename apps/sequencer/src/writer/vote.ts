import snapshot from '@snapshot-labs/snapshot.js';
import { CB } from '../constants';
import { getProposal } from '../helpers/actions';
import log from '../helpers/log';
import db from '../helpers/mysql';
import { SgpAttestationError } from '../helpers/sgpAttestation';
import {
  isDustVotingPower,
  isWithinSgpVotingWindow,
  verifyTeBallot
} from '../helpers/te';
import { getEligibilityKey } from '../helpers/teEligibility';
import { captureError, hasStrategyOverride, jsonParse } from '../helpers/utils';
import { updateProposalAndVotes } from '../scores';

const scoreAPIUrl = process.env.SCORE_API_URL || 'https://score.snapshot.org';

// async function isLimitReached(space) {
//   const limit = 1500000;
//   const query = `SELECT COUNT(*) AS count FROM messages WHERE space = ? AND timestamp > (UNIX_TIMESTAMP() - 2592000)`;
//   const [{ count }] = await db.queryAsync(query, [space]);
//   return count > limit;
// }

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.vote,
    msg.payload
  );
  if (schemaIsValid !== true) {
    log.warn('[writer] Wrong vote format', schemaIsValid);
    return Promise.reject('wrong vote format');
  }

  const proposal = await getProposal(msg.space, msg.payload.proposal);
  if (!proposal) return Promise.reject('unknown proposal');

  const tsInt = (Date.now() / 1e3).toFixed();
  const msgTs = parseInt(msg.timestamp);
  if (
    msgTs > proposal.end ||
    proposal.start > msgTs ||
    tsInt > proposal.end ||
    proposal.start > tsInt
  ) {
    return Promise.reject('not in voting window');
  }

  if (proposal.privacy === 'shutter') {
    if (msg.payload.reason) {
      return Promise.reject('reason not allowed with shutter');
    }
    if (
      typeof msg.payload.choice !== 'string' ||
      !msg.payload.choice.startsWith('0x')
    ) {
      return Promise.reject('invalid choice');
    }
  } else if (proposal.privacy === 'shutter-elgamal') {
    // The committee re-checks the voting window at tally time against the frozen
    // config, and its window is half-open where Snapshot's is closed. Adopt SGP's
    // boundary here so a vote cannot be accepted now and excluded then — see
    // helpers/te.ts for what that costs and why the alternative is worse.
    if (!isWithinSgpVotingWindow(msgTs, proposal.start, proposal.end)) {
      return Promise.reject('not in voting window');
    }
    if (msg.payload.reason) {
      return Promise.reject('reason not allowed with shutter-elgamal');
    }
    // The voter ships the encrypted ballot as a JSON object under
    // ``choice`` (the same shape ``buildBallot`` produces in the SDK,
    // serialised with all bytes as 0x-hex). Verify it now so we never
    // persist a ciphertext the tally would later reject. See
    // helpers/te.ts for the auth model.
    if (typeof msg.payload.choice !== 'object' || msg.payload.choice === null) {
      return Promise.reject('invalid choice: expected ballot object');
    }
    try {
      verifyBallotCredential(proposal, msg.payload.choice);
    } catch (err: any) {
      if (err instanceof SgpAttestationError) {
        log.warn(`[writer] credential rejected: ${err.message}`);
        return Promise.reject(`invalid ballot credential: ${err.message}`);
      }
      throw err;
    }
    // Checks the credential's signature and the voter's signature over the
    // ballot (which covers the credential), as well as the ballot proofs.
    const choiceJson = JSON.stringify(msg.payload.choice);
    const result = await verifyTeBallot(
      proposal,
      body.address.toLowerCase(),
      choiceJson,
      // The credential is inside the ballot and covered by its signature, so the
      // issuer's key is needed to check it here rather than a caller-supplied
      // predicate.
      await getEligibilityKey()
    );
    if (!result.ok) {
      return Promise.reject(`invalid private ballot: ${result.reason}`);
    }
  } else {
    if (
      !snapshot.utils.voting[proposal.type].isValidChoice(
        msg.payload.choice,
        proposal.choices
      )
    ) {
      return Promise.reject('invalid choice');
    }
  }

  if (proposal.validation?.name && proposal.validation.name !== 'any') {
    try {
      const {
        validation: { name: validationName, params: validationParams }
      } = proposal;
      if (validationName === 'basic') {
        validationParams.strategies =
          validationParams.strategies ?? proposal.strategies;
      }

      const validate = await snapshot.utils.validate(
        validationName,
        body.address,
        msg.space,
        proposal.network,
        proposal.snapshot,
        validationParams,
        { url: scoreAPIUrl }
      );
      if (!validate) return Promise.reject('failed vote validation');
    } catch (err) {
      captureError(
        err,
        { contexts: { input: { space: msg.space, address: body.address } } },
        [504]
      );
      log.warn(
        `[writer] Failed to check vote validation, ${msg.space}, ${body.address}, ${JSON.stringify(
          err
        )}`
      );
      return Promise.reject('failed to check vote validation');
    }
  }

  let vp: any = {};
  try {
    vp = await snapshot.utils.getVp(
      body.address,
      proposal.network,
      proposal.strategies,
      proposal.snapshot,
      msg.space,
      false,
      { url: scoreAPIUrl }
    );
    if (vp.vp === 0) return Promise.reject('no voting power');
    // Private ballots are weighted by an integer, so anything under 0.5 would be
    // counted as zero and dropped from the feed without ever reaching the
    // committee. Refuse it here so the voter is told, rather than shown a cast
    // vote that silently does not count.
    if (proposal.privacy === 'shutter-elgamal' && isDustVotingPower(vp.vp)) {
      return Promise.reject(
        'voting power too low for a private proposal, must be at least 0.5'
      );
    }
  } catch (err: any) {
    captureError(
      err,
      { contexts: { input: { space: msg.space, address: body.address } } },
      [504]
    );
    log.warn(
      `[writer] Failed to check voting power (vote), ${msg.space}, ${body.address}, ${
        proposal.snapshot
      }, ${JSON.stringify(err)}`
    );
    return Promise.reject('failed to check voting power');
  }

  // if (await isLimitReached(msg.space)) return Promise.reject('too much activity, please contact an admin');

  return { proposal, vp };
}

/**
 * The credential checks the SDK's `verifyBallot` does not do. They run before
 * it, because they are cheap and the proof check is not.
 */
export function verifyBallotCredential(proposal: any, choice: any): void {
  const credential = choice?.attestation;
  if (!credential) {
    throw new SgpAttestationError(
      'ballot carries no credential; request one from /te_attestation first'
    );
  }
  // The SDK only checks the credential against the ballot's own election id.
  if (
    credential.electionId?.toLowerCase() !== String(proposal.id).toLowerCase()
  ) {
    throw new SgpAttestationError('credential is for a different proposal');
  }
  // JSON numbers, not strings: the keypers' decoder rejects a quoted integer,
  // while BigInt() here would accept it and the ballot would be dropped at tally.
  if (!Number.isInteger(credential.weight)) {
    throw new SgpAttestationError('credential weight must be an integer');
  }
  if (!Number.isInteger(credential.nonce)) {
    throw new SgpAttestationError('credential nonce must be an integer');
  }
}

export async function action(body, ipfs, receipt, id, context): Promise<void> {
  const msg = jsonParse(body.msg);
  const voter = body.address;
  const created = parseInt(msg.timestamp);
  const choice = JSON.stringify(msg.payload.choice);
  const metadata = JSON.stringify(msg.payload.metadata || {});
  const app = msg.payload.app;
  const reason = msg.payload.reason || '';
  const proposalId = msg.payload.proposal;

  // Check if voting power is final
  let vpState = context.vp.vp_state;
  const withOverride = hasStrategyOverride(context.proposal.strategies);
  if (vpState === 'final' && withOverride) vpState = 'pending';

  const params = {
    id,
    ipfs,
    voter,
    created,
    space: msg.space,
    proposal: proposalId,
    choice,
    metadata,
    reason,
    app,
    vp: context.vp.vp,
    vp_by_strategy: JSON.stringify(context.vp.vp_by_strategy),
    vp_state: vpState,
    vp_value: 0,
    cb: CB.PENDING_COMPUTE
    // No credential columns. The credential lives inside
    // `choice`, which is the artifact the EIP-712 signature covers, and the hub's
    // feed serves them from there. A scalar copy beside it would be a second,
    // unsigned source for bytes the committee verifies a signature over.
  };

  // Check if voter already voted
  const votes = await db.queryAsync(
    'SELECT id, created FROM votes WHERE voter = ? AND proposal = ? AND space = ? ORDER BY created DESC LIMIT 1',
    [voter, proposalId, msg.space]
  );

  // Reject vote with later timestamp
  if (votes[0]) {
    if (votes[0].created > parseInt(msg.timestamp)) {
      return Promise.reject('already voted at later time');
    } else if (votes[0].created === parseInt(msg.timestamp)) {
      const localCompare = id.localeCompare(votes[0].id);
      if (localCompare <= 0) {
        return Promise.reject('already voted same time with lower index');
      }
    }
    // Update previous vote
    log.info(`[writer] Update previous vote, ${voter}, ${proposalId}`);
    await db.queryAsync(
      `
      UPDATE votes
      SET id = ?, ipfs = ?, created = ?, choice = ?, reason = ?, metadata = ?, app = ?, vp = ?, vp_by_strategy = ?, vp_state = ?
      WHERE voter = ? AND proposal = ? AND space = ?;
      UPDATE leaderboard SET last_vote = ? WHERE user = ? AND space = ? LIMIT 1;
    `,
      [
        id,
        ipfs,
        created,
        choice,
        reason,
        metadata,
        app,
        params.vp,
        params.vp_by_strategy,
        params.vp_state,
        // `choice` above carries the credential and the binding, so a re-vote
        // replaces them with the ballot they belong to in one statement — there
        // is no separate credential to leave stale.
        voter,
        proposalId,
        msg.space,
        created,
        voter,
        msg.space
      ]
    );
  } else {
    // Store vote in dedicated table
    await db.queryAsync(
      `
        INSERT INTO votes SET ?;
        INSERT INTO leaderboard (space, user, vote_count, last_vote, vp_value)
          VALUES(?, ?, 1, ?, 0)
          ON DUPLICATE KEY UPDATE vote_count = vote_count + 1, last_vote = ?;
        UPDATE spaces SET vote_count = vote_count + 1 WHERE id = ?;
      `,
      [params, msg.space, voter, created, created, msg.space]
    );
  }

  // Update proposal scores and voters vp
  try {
    const result = await updateProposalAndVotes(proposalId);
    if (!result) {
      log.warn(`[writer] updateProposalAndVotes() false, ${proposalId}`);
    }
  } catch (err: any) {
    captureError(
      err,
      { contexts: { input: { space: msg.space, id: proposalId } } },
      [504]
    );
    log.warn(
      `[writer] updateProposalAndVotes() failed, ${msg.space}, ${proposalId}`
    );
  }
}
