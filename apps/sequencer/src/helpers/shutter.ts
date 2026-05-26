import { arrayify } from '@ethersproject/bytes';
import { toUtf8String } from '@ethersproject/strings';
import { decrypt, init } from '@shutter-network/shutter-crypto';
import { capture } from '@snapshot-labs/snapshot-sentry';
import express from 'express';
import log from './log';
import db from './mysql';
import {
  getIp,
  jsonParse,
  jsonRpcRequest,
  rpcError,
  rpcSuccess
} from './utils';
import { CB } from '../constants';
import { updateProposalAndVotes } from '../scores';

init().then(() => log.info('[shutter] init'));

const SHUTTER_URL = process.env.SHUTTER_URL ?? '';
const SHUTTER_IPS = ['164.92.221.74', '2a03:b0c0:2:d0::13be:6001'];
const router = express.Router();

export async function shutterDecrypt(
  encryptedMsg: string,
  decryptionKey: string
) {
  try {
    const decryptedMsg = await decrypt(
      arrayify(encryptedMsg),
      arrayify(decryptionKey)
    );
    const result = toUtf8String(decryptedMsg);
    return result;
  } catch (err) {
    capture(err);
    log.warn(`[shutter] error ${JSON.stringify(err)}`);
    return false;
  }
}

function proposalToId(proposal: string): string | boolean {
  if (!proposal.startsWith('0x')) return false;
  return proposal.slice(2);
}

function idToProposal(id: string): string {
  return `0x${id}`;
}

export async function getDecryptionKey(
  proposal: string,
  url: string = SHUTTER_URL
) {
  const id = proposalToId(proposal);
  const result = await jsonRpcRequest(url, 'get_decryption_key', ['1', id]);
  log.info(
    `[shutter] get_decryption_key ${proposal} ${JSON.stringify(result)}`
  );

  return result;
}

async function setEonPubkey(params) {
  log.info(`[shutter] set eon pubkey ${JSON.stringify(params)}`);
  return true;
}

export async function setProposalKey(params) {
  try {
    const [id, key] = params;
    const proposalId = idToProposal(id);
    let query =
      'SELECT id, end FROM proposals WHERE id = ? AND privacy = ? LIMIT 1';
    const [proposal] = await db.queryAsync(query, [proposalId, 'shutter']);

    const ts = (Date.now() / 1e3).toFixed();
    if (!proposal || ts < proposal.end) return false;

    query = 'SELECT id, choice FROM votes WHERE proposal = ? AND cb != ?';
    const votes = await db.queryAsync(query, [proposal.id, CB.PENDING_DELETE]);

    const sqlParams: string[] = [];
    let sqlQuery = '';

    for (const vote of votes) {
      const choice = await shutterDecrypt(jsonParse(vote.choice), `0x${key}`);
      log.info(`[shutter] decrypted choice ${JSON.stringify(choice)}`);
      if (choice !== false && choice !== '') {
        sqlQuery += `UPDATE votes SET choice = ? WHERE id = ? LIMIT 1; `;
        sqlParams.push(choice);
        sqlParams.push(vote.id);
      }
    }

    if (sqlQuery) await db.queryAsync(sqlQuery, sqlParams);
    log.info(`[shutter] choices decrypted and updated for ${proposalId}`);

    await updateProposalAndVotes(proposal.id, true);
    log.info(`[shutter] proposal scores updated for ${proposalId}`);
  } catch (err) {
    capture(err);
    log.warn(`[shutter] setProposalKey failed ${JSON.stringify(err)}`);
    return false;
  }
  return true;
}

router.all('/', async (req, res) => {
  log.info(
    `[shutter] incoming rpc request ${JSON.stringify(req.body)} from ${getIp(req)}`
  );

  if (!SHUTTER_IPS.includes(getIp(req))) {
    log.warn(`[shutter] wrong ip`);
    return rpcError(res, 500, 'not authorized ip', null);
  }

  const id = req.body.id || null;
  try {
    const { method, params } = req.body;

    if (method === 'shutter_set_eon_pubkey') {
      setEonPubkey(params);
      return rpcSuccess(res, true, id);
    }

    if (method === 'shutter_set_proposal_key') {
      log.info(`[shutter] shutter_set_proposal_key ${JSON.stringify(params)}`);
      setProposalKey(params);
      return rpcSuccess(res, true, id);
    }

    return rpcError(res, 500, 'wrong method', id);
  } catch (err) {
    capture(err);
    log.warn(`[shutter] failed ${JSON.stringify(err)}`);
    return rpcError(res, 500, err, id);
  }
});

export default router;
