import snapshot from '@snapshot-labs/snapshot.js';
import { CB } from '../constants';
import { getProposal } from '../helpers/actions';
import {
  GegAttestationError,
  verifyAttestation
} from '../helpers/gegAttestation';
import { verifyBallotSignature } from '../helpers/gegBinding';
import log from '../helpers/log';
import db from '../helpers/mysql';
import {
  isDustVotingPower,
  isWithinGegVotingWindow,
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
  )
    return Promise.reject('not in voting window');

  if (proposal.privacy === 'shutter') {
    if (msg.payload.reason)
      return Promise.reject('reason not allowed with shutter');
    if (
      typeof msg.payload.choice !== 'string' ||
      !msg.payload.choice.startsWith('0x')
    )
      return Promise.reject('invalid choice');
  } else if (proposal.privacy === 'shutter-elgamal') {
    // The committee re-checks the voting window at tally time against the frozen
    // config, and its window is half-open where Snapshot's is closed. Adopt geg's
    // boundary here so a vote cannot be accepted now and excluded then — see
    // helpers/te.ts for what that costs and why the alternative is worse.
    if (!isWithinGegVotingWindow(msgTs, proposal.start, proposal.end)) {
      return Promise.reject('not in voting window');
    }
    if (msg.payload.reason)
      return Promise.reject('reason not allowed with shutter-elgamal');
    // The voter ships the encrypted ballot as a JSON object under
    // ``choice`` (the same shape ``buildBallot`` produces in the SDK,
    // serialised with all bytes as 0x-hex). Verify it now so we never
    // persist a ciphertext the tally would later reject. See
    // helpers/te.ts for the auth model.
    if (typeof msg.payload.choice !== 'object' || msg.payload.choice === null) {
      return Promise.reject('invalid choice: expected ballot object');
    }
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
    )
      return Promise.reject('invalid choice');
  }

  if (proposal.validation?.name && proposal.validation.name !== 'any') {
    try {
      const {
        validation: { name: validationName, params: validationParams }
      } = proposal;
      if (validationName === 'basic')
        validationParams.strategies =
          validationParams.strategies ?? proposal.strategies;

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

  // Verify the credential the voter presented; do not mint one.
  //
  // The sequencer used to mint here, from voting power it had just computed.
  // That put the signature next to the component that made the claim, but it
  // also meant `weight` and `nonce` were this service's assertions about a voter
  // who had never seen them — and `nonce` decides which of a voter's ballots the
  // committee counts. Credentials are now issued up front
  // (`helpers/teAttestationIssuer`), shown to the voter, and signed by them
  // together with the ballot. What is left here is checking that.
  //
  // Both signatures are required. The issuer's proves the weight was authorised;
  // the voter's proves *this* ballot was cast with *that* credential. Either one
  // alone leaves the pairing forgeable by whoever assembles it.
  let attestation: TeAttestation | null = null;
  if (proposal.privacy === 'shutter-elgamal') {
    try {
      attestation = await verifyBallotCredential(proposal, msg);
    } catch (err: any) {
      if (err instanceof GegAttestationError) {
        log.warn(`[writer] credential rejected: ${err.message}`);
        return Promise.reject(`invalid ballot credential: ${err.message}`);
      }
      throw err;
    }
  }

  return { proposal, vp, attestation };
}

export interface TeAttestation {
  weight: number;
  nonce: number;
  signature: string;
}

// Exported for tests: the structural checks here run before any crypto, so
// they can be exercised without standing up a valid ballot.
export async function verifyBallotCredential(
  proposal: any,
  msg: any
): Promise<TeAttestation> {
  // `getProposal` already parses this column, so it arrives as an object;
  // parsing it again yields the string "[object Object]" and no budget at all.
  const teConfig =
    typeof proposal.te_config === 'string'
      ? jsonParse(proposal.te_config, null)
      : proposal.te_config;
  const budget = Number(teConfig?.budget);
  if (!Number.isInteger(budget) || budget < 1) {
    throw new GegAttestationError(
      `proposal ${proposal.id} has no usable ballot budget`
    );
  }
  const envelope = jsonParse(JSON.stringify(msg.payload.choice), null);
  const credential = envelope?.attestation;
  if (!credential) {
    throw new GegAttestationError(
      'ballot carries no credential; request one from /te_attestation first'
    );
  }

  // The credential must name this ballot. Without these the committee would
  // reject it at tally as INVALID_ATTESTATION, which is a silent loss of a vote
  // the voter was told had been cast.
  if (
    credential.electionId?.toLowerCase() !== String(proposal.id).toLowerCase()
  )
    throw new GegAttestationError('credential is for a different proposal');
  if (credential.pseudonym !== envelope.pseudonym)
    throw new GegAttestationError('credential does not match this pseudonym');
  if (credential.vk !== envelope.vk)
    throw new GegAttestationError('credential does not match this ballot key');

  // JSON numbers, not strings. The credential is stored verbatim inside `choice`
  // and served to the committee from there, and geg's decoder requires an integer
  // (`envelopes/codecs.py::_int` rejects a str). Coercing would be worse than
  // refusing: `BigInt("10000")` and `bindingMessage` both accept a string, so a
  // quoted weight verifies here and is then rejected by every keyper — the ballot
  // is excluded for a reason that looks nothing like the cause.
  if (!Number.isInteger(credential.weight))
    throw new GegAttestationError('credential weight must be an integer');
  if (!Number.isInteger(credential.nonce))
    throw new GegAttestationError('credential nonce must be an integer');

  const weight = BigInt(credential.weight);
  const nonce = BigInt(credential.nonce);

  // The issuer's signature: the weight was authorised by us, and is inside the
  // cap the committee enforces.
  const ok = await verifyAttestation({
    electionId: proposal.id,
    pseudonym: credential.pseudonym,
    vk: credential.vk,
    weight,
    nonce,
    signature: credential.signature
  });
  if (!ok) throw new GegAttestationError('credential signature is not valid');

  // The voter's signature over the ballot — which since the v2 ballot message
  // covers the credential. This is what stops a credential being moved onto a
  // different ballot of the same voter, and what makes the weight something the
  // voter endorsed rather than something we asserted. It used to take a second
  // signature of its own; the ballot's own signature does it now.
  if (!(await verifyBallotSignature({ envelope, attestation: credential }))) {
    throw new GegAttestationError(
      'ballot signature does not cover this credential'
    );
  }

  return {
    weight: Number(weight),
    nonce: Number(nonce),
    signature: credential.signature
  };
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
      if (localCompare <= 0)
        return Promise.reject('already voted same time with lower index');
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
    if (!result)
      log.warn(`[writer] updateProposalAndVotes() false, ${proposalId}`);
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
