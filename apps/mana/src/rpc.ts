import fetch from 'cross-fetch';
global.fetch = fetch;
import express from 'express';
import { Account, ec } from 'starknet';
import { clients } from '@snapshot-labs/sx';
import { rpcError, rpcSuccess } from './utils';
import { starkProvider } from './starkProvider';

const starknetPrivkey = process.env.STARKNET_PRIVKEY || '';
const starknetAddress = process.env.STARKNET_ADDRESS || '';

const client = new clients.StarkNetTx({
  starkProvider,
  ethUrl: process.env.ETH_RPC_URL as string
});
const starkKeyPair = ec.getKeyPair(starknetPrivkey);
const account = new Account(starkProvider, starknetAddress, starkKeyPair);

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
      receipt = await client.propose(account, params.envelop);
    }

    if (types.Vote) {
      console.log('Vote');
      receipt = await client.vote(account, params.envelop);
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
