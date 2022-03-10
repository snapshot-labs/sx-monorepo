import express from 'express';
import { rpcError, rpcSuccess } from './utils';
import { propose, vote } from '../sx.js/src';

const router = express.Router();

router.all('/', async (req, res) => {
  const { id } = req.body;
  try {
    const { types } = req.body.params.envelop;
    let receipt;
    console.time('Send');
    if (types.Proposal) {
      const space = '0x06d6de57282e6798ab5a1fa56686b65fc0282b1c4b95b86df85f4a44ee5dc8ae';
      receipt = await propose(space);
    }
    if (types.Vote) {
      const space = '0x06d6de57282e6798ab5a1fa56686b65fc0282b1c4b95b86df85f4a44ee5dc8ae';
      receipt = await vote(space);
    }
    console.timeEnd('Send');
    console.log('Receipt', receipt);
    return rpcSuccess(res, receipt, id);
  } catch (e) {
    return rpcError(res, 500, e, id);
  }
});

export default router;
