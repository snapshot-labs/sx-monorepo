import fetch from 'cross-fetch';
global.fetch = fetch;
import express from 'express';
import { Account, defaultProvider, ec } from 'starknet';
import { StarkNetTx } from '@snapshot-labs/sx/dist/clients';
import { rpcError, rpcSuccess } from './utils';

const starknetPrivkey = process.env.STARKNET_PRIVKEY || '';
const starknetAddress = process.env.STARKNET_ADDRESS || '';
const client = new StarkNetTx();
const starkKeyPair = ec.getKeyPair(starknetPrivkey);
const account = new Account(defaultProvider, starknetAddress, starkKeyPair);

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
      receipt = await client.propose(
        account,
        address,
        message.space,
        message.executionHash,
        message.metadataURI
      );
    }

    if (types.Vote) {
      console.log('Vote');
      receipt = await client.vote(
        account,
        address,
        message.space,
        message.proposal,
        message.choice
      );
    }

    console.timeEnd('Send');
    console.log('Receipt', receipt);

    return rpcSuccess(res, receipt, id);
  } catch (e) {
    console.log('Failed', e);
    return rpcError(res, 500, e, id);
  }
}

const fn = { send };

router.post('/', async (req, res) => {
  const { id, method, params } = req.body;
  return await fn[method](id, params, res);
});

export default router;
