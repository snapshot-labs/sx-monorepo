import { createHash } from 'node:crypto';
import { getAddress } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/keccak256';
import { verifyMessage } from '@ethersproject/wallet';
import {
  G2Point,
  initCurves,
  Transcript,
  verifyDecryptionShare
} from '@snapshot-labs/private-vote-sdk';
import { capture } from '@snapshot-labs/snapshot-sentry';
import express from 'express';
import log from './helpers/log';
import db from './helpers/mysql';
import { sendError } from './helpers/utils';

let curvesReady: Promise<void> | null = null;
function ensureCurvesInit(): Promise<void> {
  if (!curvesReady) curvesReady = initCurves();
  return curvesReady;
}

const router = express.Router();

// Domain separation tags must match services/keypers/src/hub_client.py.
const DST_TE_DKG = Buffer.from('SX-TE-DKG-v1', 'utf8');
const DST_TE_DECRYPT = Buffer.from('SX-TE-DECRYPT-v1', 'utf8');

function uint32BE(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function decodeHex(s: unknown, label: string): Buffer {
  if (typeof s !== 'string') throw new Error(`${label}: not a string`);
  const stripped = s.startsWith('0x') ? s.slice(2) : s;
  if (!/^[0-9a-fA-F]*$/.test(stripped) || stripped.length % 2 !== 0) {
    throw new Error(`${label}: not hex`);
  }
  return Buffer.from(stripped, 'hex');
}

function committeePksHash(committeePksHex: string[]): Buffer {
  const parts: Buffer[] = [uint32BE(committeePksHex.length)];
  for (const pk of committeePksHex) {
    const b = decodeHex(pk, 'committee_pks element');
    parts.push(uint32BE(b.length));
    parts.push(b);
  }
  // SHA-256 to mirror hub_client.py's _committee_pks_hash.
  return createHash('sha256').update(Buffer.concat(parts)).digest();
}

function teDkgPayloadHash(
  proposalId: string,
  mpkHex: string,
  committeePksHex: string[]
): Buffer {
  const idBytes = Buffer.from(proposalId, 'utf8');
  const mpkBytes = decodeHex(mpkHex, 'mpk');
  const buf = Buffer.concat([
    DST_TE_DKG,
    uint32BE(idBytes.length),
    idBytes,
    mpkBytes,
    committeePksHash(committeePksHex)
  ]);
  // keccak256 returns 0x-prefixed; convert to Buffer.
  return Buffer.from(keccak256(buf).slice(2), 'hex');
}

function teSharePayloadHash(
  proposalId: string,
  candidate: number,
  sigmaHex: string,
  proofE: string,
  proofZ: string
): Buffer {
  const idBytes = Buffer.from(proposalId, 'utf8');
  const sigma = decodeHex(sigmaHex, 'sigma');
  const eBig = BigInt(proofE);
  const zBig = BigInt(proofZ);
  if (eBig < 0n || zBig < 0n) throw new Error('negative scalar');
  const eBuf = Buffer.alloc(32);
  const zBuf = Buffer.alloc(32);
  // Big-endian 32-byte uints, matching the python eth_utils.keccak source.
  const eHex = eBig.toString(16).padStart(64, '0');
  const zHex = zBig.toString(16).padStart(64, '0');
  if (eHex.length > 64 || zHex.length > 64)
    throw new Error('scalar > 32 bytes');
  Buffer.from(eHex, 'hex').copy(eBuf);
  Buffer.from(zHex, 'hex').copy(zBuf);
  const buf = Buffer.concat([
    DST_TE_DECRYPT,
    uint32BE(idBytes.length),
    idBytes,
    uint32BE(candidate),
    sigma,
    eBuf,
    zBuf
  ]);
  return Buffer.from(keccak256(buf).slice(2), 'hex');
}

async function loadProposal(proposalId: string): Promise<any | null> {
  const rows = await (db as any).queryAsync(
    'SELECT id, privacy, te_mpk, te_config, te_committee_pks, te_keyper_addresses, te_threshold_t, te_threshold_n, te_aggregate FROM proposals WHERE id = ? LIMIT 1',
    [proposalId]
  );
  return rows[0] || null;
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

router.post('/proposal/:id/te_dkg', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 400);
    }
    if (proposal.te_mpk) {
      // Already finalised. Idempotent ack.
      return res.json({ status: 'already_finalized' });
    }

    const {
      keyper_index: keyperIndex,
      keyper_address: keyperAddress,
      mpk,
      committee_pks: committeePks,
      signature
    } = req.body || {};

    if (
      typeof keyperIndex !== 'number' ||
      typeof keyperAddress !== 'string' ||
      typeof mpk !== 'string' ||
      !Array.isArray(committeePks) ||
      typeof signature !== 'string'
    ) {
      return sendError(res, 'bad_request', 400);
    }

    let normalizedKeyperAddress: string;
    try {
      normalizedKeyperAddress = getAddress(keyperAddress);
    } catch {
      return sendError(res, 'bad_request', 400);
    }

    const keyperAddresses = parseJsonField<string[] | null>(
      proposal.te_keyper_addresses,
      null
    );
    if (!keyperAddresses || keyperAddresses.length === 0) {
      // Until the admin-space-settings flow (Phase 7) populates this, we
      // cannot authenticate keypers. Reject loudly rather than write
      // unverified state.
      return sendError(res, 'keyper_set_not_configured', 503);
    }

    if (
      keyperIndex < 1 ||
      keyperIndex > keyperAddresses.length ||
      keyperAddresses[keyperIndex - 1] !== normalizedKeyperAddress
    ) {
      return sendError(res, 'unknown_keyper', 401);
    }

    const payloadHash = teDkgPayloadHash(proposalId, mpk, committeePks);
    let recovered: string;
    try {
      recovered = verifyMessage(payloadHash, signature);
    } catch {
      return sendError(res, 'bad_signature', 401);
    }
    if (recovered !== normalizedKeyperAddress) {
      return sendError(res, 'bad_signature', 401);
    }

    const committeePksJson = JSON.stringify(committeePks);
    const ts = Math.floor(Date.now() / 1000);

    // Append-only per (proposal, keyper). Replays from the same keyper
    // on the same (mpk, committee_pks) are idempotent; conflicting
    // submissions are rejected.
    const existing = await (db as any).queryAsync(
      'SELECT mpk_hex, committee_pks_hex FROM te_dkg_submissions WHERE proposal_id = ? AND keyper_index = ? LIMIT 1',
      [proposalId, keyperIndex]
    );
    if (existing[0]) {
      if (
        existing[0].mpk_hex !== mpk ||
        existing[0].committee_pks_hex !== committeePksJson
      ) {
        return sendError(res, 'keyper_changed_submission', 409);
      }
    } else {
      await (db as any).queryAsync(
        'INSERT INTO te_dkg_submissions (proposal_id, keyper_index, keyper_address, mpk_hex, committee_pks_hex, signature, posted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          proposalId,
          keyperIndex,
          normalizedKeyperAddress,
          mpk,
          committeePksJson,
          signature,
          ts
        ]
      );
    }

    // Threshold check: count distinct keypers who agree on this exact tuple.
    const tally = await (db as any).queryAsync(
      'SELECT COUNT(*) AS c FROM te_dkg_submissions WHERE proposal_id = ? AND mpk_hex = ? AND committee_pks_hex = ?',
      [proposalId, mpk, committeePksJson]
    );
    const matching: number = Number(tally[0]?.c || 0);
    const requiredAgreement = Number(proposal.te_threshold_t || 0) + 1;

    if (matching >= requiredAgreement) {
      // Finalise. Re-check te_mpk under the same query to keep the write
      // a no-op if a concurrent request already committed.
      await (db as any).queryAsync(
        'UPDATE proposals SET te_mpk = UNHEX(?), te_committee_pks = ? WHERE id = ? AND te_mpk IS NULL',
        [mpk.replace(/^0x/, ''), committeePksJson, proposalId]
      );
      return res.json({
        status: 'finalized',
        matching_submissions: matching,
        required: requiredAgreement
      });
    }

    return res.json({
      status: 'accepted',
      matching_submissions: matching,
      required: requiredAgreement
    });
  } catch (err: any) {
    log.error(`[te_dkg] ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

router.get('/proposal/:id/te_aggregate', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 400);
    }
    const aggregate = parseJsonField<any>(proposal.te_aggregate, null);
    if (!aggregate) return sendError(res, 'aggregate_not_ready', 404);
    return res.json(aggregate);
  } catch (err: any) {
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

// Phase 8 — public read endpoint for the verify-tally button. Returns
// every committed decryption share plus the public DKG outputs the
// auditor needs to call SDK `recoverTally`. No authentication; the
// shares and their DLEQ proofs are designed to be public.
router.get('/proposal/:id/te_decryption_shares', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 400);
    }
    if (!proposal.te_mpk) {
      return sendError(res, 'dkg_not_finalized', 400);
    }
    const aggregate = parseJsonField<any>(proposal.te_aggregate, null);
    const rows = await (db as any).queryAsync(
      'SELECT keyper_index, candidate, HEX(sigma) AS sigma_hex, HEX(proof_e) AS proof_e_hex, HEX(proof_z) AS proof_z_hex FROM te_decryption_shares WHERE proposal_id = ? ORDER BY candidate, keyper_index',
      [proposalId]
    );
    return res.json({
      te_mpk: `0x${Buffer.from(proposal.te_mpk).toString('hex')}`,
      te_config: parseJsonField<any>(proposal.te_config, null),
      te_committee_pks: parseJsonField<any>(proposal.te_committee_pks, []),
      te_threshold_t: Number(proposal.te_threshold_t),
      te_threshold_n: Number(proposal.te_threshold_n),
      te_keyper_addresses: parseJsonField<any>(
        proposal.te_keyper_addresses,
        []
      ),
      aggregate,
      shares: (rows as any[]).map(r => ({
        keyper_index: Number(r.keyper_index),
        candidate: Number(r.candidate),
        sigma: `0x${r.sigma_hex.toLowerCase()}`,
        proof_e: `0x${r.proof_e_hex.toLowerCase()}`,
        proof_z: `0x${r.proof_z_hex.toLowerCase()}`
      }))
    });
  } catch (err: any) {
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

// Phase 8 (trustless audit) — public read endpoint returning every
// individual encrypted ballot together with the voting power it was
// counted with. The choice envelope is permanently encrypted (it never
// reveals how the voter voted), so exposing it leaks nothing the tally
// does not already imply; the voting power is public information (it is
// shown for every normal Snapshot vote and is independently recomputable
// from the proposal's strategies). An auditor uses this to (a) verify
// each ballot's zero-knowledge validity proof and (b) recompute the
// voting-power-weighted homomorphic aggregate and confirm it equals the
// published `te_aggregate` — closing the "did the sequencer sum the real
// ballots?" gap.
router.get('/proposal/:id/te_ballots', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 400);
    }
    if (!proposal.te_mpk) {
      return sendError(res, 'dkg_not_finalized', 400);
    }
    const rows = await (db as any).queryAsync(
      // cb != -3 excludes soft-deleted votes (CB.PENDING_DELETE in sequencer/constants.ts)
      'SELECT voter, vp, choice FROM votes WHERE proposal = ? AND cb != -3 ORDER BY created ASC',
      [proposalId]
    );
    return res.json({
      te_mpk: `0x${Buffer.from(proposal.te_mpk).toString('hex')}`,
      te_config: parseJsonField<any>(proposal.te_config, null),
      ballots: (rows as any[]).map(r => ({
        voter: r.voter,
        vp: Number(r.vp),
        choice: parseJsonField<any>(r.choice, null)
      }))
    });
  } catch (err: any) {
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

router.post('/proposal/:id/te_decryption_share', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 400);
    }
    if (!proposal.te_aggregate) {
      return sendError(res, 'aggregate_not_ready', 400);
    }
    if (!proposal.te_mpk) {
      return sendError(res, 'dkg_not_finalized', 400);
    }

    const {
      keyper_index: keyperIndex,
      keyper_address: keyperAddress,
      candidate,
      sigma,
      proof_e: proofE,
      proof_z: proofZ,
      signature
    } = req.body || {};

    if (
      typeof keyperIndex !== 'number' ||
      typeof keyperAddress !== 'string' ||
      typeof candidate !== 'number' ||
      typeof sigma !== 'string' ||
      typeof proofE !== 'string' ||
      typeof proofZ !== 'string' ||
      typeof signature !== 'string'
    ) {
      return sendError(res, 'bad_request', 400);
    }

    let normalizedKeyperAddress: string;
    try {
      normalizedKeyperAddress = getAddress(keyperAddress);
    } catch {
      return sendError(res, 'bad_request', 400);
    }

    const keyperAddresses = parseJsonField<string[] | null>(
      proposal.te_keyper_addresses,
      null
    );
    if (
      !keyperAddresses ||
      keyperIndex < 1 ||
      keyperIndex > keyperAddresses.length ||
      keyperAddresses[keyperIndex - 1] !== normalizedKeyperAddress
    ) {
      return sendError(res, 'unknown_keyper', 401);
    }

    let payloadHash: Buffer;
    try {
      payloadHash = teSharePayloadHash(
        proposalId,
        candidate,
        sigma,
        proofE,
        proofZ
      );
    } catch {
      return sendError(res, 'bad_request', 400);
    }
    let recovered: string;
    try {
      recovered = verifyMessage(payloadHash, signature);
    } catch {
      return sendError(res, 'bad_signature', 401);
    }
    if (recovered !== normalizedKeyperAddress) {
      return sendError(res, 'bad_signature', 401);
    }

    // DLEQ proof verification — reject a bad proof before it can be stored.
    // INSERT IGNORE makes the first stored share permanent, so we must verify
    // correctness here rather than letting an unverified share lock in.
    await ensureCurvesInit();

    const aggregate = parseJsonField<{
      election_id: string;
      num_candidates: number;
      ciphertexts: Array<{ c1: string; c2: string }>;
    } | null>(proposal.te_aggregate, null);
    if (
      !aggregate?.ciphertexts ||
      candidate < 0 ||
      candidate >= aggregate.ciphertexts.length
    ) {
      return sendError(res, 'candidate_out_of_range', 400);
    }
    const committeePksArr = parseJsonField<string[] | null>(
      proposal.te_committee_pks,
      null
    );
    if (!committeePksArr || keyperIndex > committeePksArr.length) {
      return sendError(res, 'committee_pks_not_configured', 503);
    }

    let ctC1: G2Point | null = null;
    let ctC2: G2Point | null = null;
    let sigmaPoint: G2Point | null = null;
    let committeePK: G2Point | null = null;
    try {
      const ctEntry = aggregate.ciphertexts[candidate];
      ctC1 = G2Point.fromBytes(decodeHex(ctEntry.c1, 'ct.c1'));
      ctC2 = G2Point.fromBytes(decodeHex(ctEntry.c2, 'ct.c2'));
      sigmaPoint = G2Point.fromBytes(decodeHex(sigma, 'sigma'));
      committeePK = G2Point.fromBytes(
        decodeHex(committeePksArr[keyperIndex - 1], 'committeePK')
      );
    } catch {
      ctC1?.destroyWasm();
      ctC2?.destroyWasm();
      sigmaPoint?.destroyWasm();
      committeePK?.destroyWasm();
      return sendError(res, 'bad_request', 400);
    }

    // Transcript must match the keyper's sdk_compat.make_onchain_decrypt_transcript exactly:
    //   label="SHUTTER-VOTE-DECRYPT-v1", electionId=32-byte proposalId, candidate=u16BE
    const dleqTranscript = new Transcript('SHUTTER-VOTE-DECRYPT-v1');
    dleqTranscript.append('electionId', decodeHex(proposalId, 'proposalId'));
    const candidateBuf = Buffer.alloc(2);
    candidateBuf.writeUInt16BE(candidate, 0);
    dleqTranscript.append('candidate', candidateBuf);

    let dleqOk: boolean;
    try {
      dleqOk = verifyDecryptionShare(
        { c1: ctC1, c2: ctC2 },
        {
          keyperIndex,
          sigma: sigmaPoint,
          proof: { e: BigInt(proofE), z: BigInt(proofZ) }
        },
        committeePK,
        dleqTranscript
      );
    } finally {
      ctC1.destroyWasm();
      ctC2.destroyWasm();
      sigmaPoint.destroyWasm();
      committeePK.destroyWasm();
    }

    if (!dleqOk) {
      log.error(
        `[te_decryption_share] ${proposalId}: DLEQ proof invalid for keyper ${keyperIndex} candidate ${candidate}`
      );
      return sendError(res, 'invalid_dleq_proof', 400);
    }

    const ts = Math.floor(Date.now() / 1000);
    // INSERT IGNORE makes (proposal, keyper, candidate) idempotent — a
    // retry from a flaky keyper does not error out.
    await (db as any).queryAsync(
      'INSERT IGNORE INTO te_decryption_shares (proposal_id, keyper_index, candidate, sigma, proof_e, proof_z, posted_at) VALUES (?, ?, ?, UNHEX(?), UNHEX(?), UNHEX(?), ?)',
      [
        proposalId,
        keyperIndex,
        candidate,
        sigma.replace(/^0x/, ''),
        BigInt(proofE).toString(16).padStart(64, '0'),
        BigInt(proofZ).toString(16).padStart(64, '0'),
        ts
      ]
    );

    return res.json({ status: 'accepted' });
  } catch (err: any) {
    log.error(`[te_decryption_share] ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

export default router;
