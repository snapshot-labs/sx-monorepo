import express from 'express';
import { propose, vote } from '@snapshot-labs/sx';
import { rpcError, rpcSuccess } from './utils';
import { set } from './pinata';

const router = express.Router();

async function send(id, params, res) {
  try {
    const { address } = params.envelop;
    const { types, message } = params.envelop.data;
    let receipt;

    console.time('Send');
    console.log('Types', types);
    console.log('Address', address);
    console.log('Message', message);

    if (types.Propose) {
      console.log('Propose');
      receipt = await propose(address, message.space, message.executionHash, message.metadataURI);
    }

    if (types.Vote) {
      console.log('Vote');
      receipt = await vote(address, message.space, message.proposal, message.choice);
    }

    console.timeEnd('Send');
    console.log('Receipt', receipt);

    return rpcSuccess(res, receipt, id);
  } catch (e) {
    console.log('Failed', e);
    return rpcError(res, 500, e, id);
  }
}

async function pin(id, params, res) {
  const result = await set(params);
  return rpcSuccess(res, result, id);
}

const fn = { send, pin };

router.post('/', async (req, res) => {
  const { id, method, params } = req.body;
  return await fn[method](id, params, res);
});

export default router;
