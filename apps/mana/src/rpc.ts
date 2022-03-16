import express from 'express';
import { propose, vote } from '@snapshot-labs/sx';
import { rpcError, rpcSuccess } from './utils';

const router = express.Router();

router.post('/', async (req, res) => {
  const { id } = req.body;
  try {
    const { address } = req.body.params.envelop;
    const { types, message } = req.body.params.envelop.data;
    let receipt;
    console.time('Send');
    if (types.Propose)
      receipt = await propose(address, message.space, message.executionHash, message.metadataURI);
    if (types.Vote) receipt = await vote(address, message.space, message.proposal, message.choice);
    console.timeEnd('Send');
    console.log('Receipt', receipt);
    return rpcSuccess(res, receipt, id);
  } catch (e) {
    console.log('Failed', e);
    return rpcError(res, 500, e, id);
  }
});

export default router;
