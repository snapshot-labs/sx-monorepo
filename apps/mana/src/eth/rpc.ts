import express from 'express';
import { clients } from '@snapshot-labs/sx';
import { wallet } from './dependencies';
import { rpcError, rpcSuccess } from '../utils';

const client = new clients.EvmEthereumTx();

const router = express.Router();

async function send(id, params, res) {
  try {
    const { signatureData, data } = params.envelope;
    const { types } = signatureData;
    let receipt;

    console.time('Send');
    console.log('Types', types);
    console.log('Message', data);

    if (types.Propose) {
      receipt = await client.propose({
        signer: wallet,
        envelope: params.envelope
      });
    } else if (types.Vote) {
      receipt = await client.vote({
        signer: wallet,
        envelope: params.envelope
      });
    }

    console.log('Receipt', receipt);

    return rpcSuccess(res, receipt, id);
  } catch (e) {
    console.log('Failed', e);
    return rpcError(res, 500, e, id);
  } finally {
    console.timeEnd('Send');
  }
}

async function execute(id, params, res) {
  try {
    const { space, proposalId, executionParams } = params;
    const receipt = await client.execute({
      signer: wallet,
      space,
      proposal: proposalId,
      executionParams
    });

    return rpcSuccess(res, receipt, id);
  } catch (e) {
    return rpcError(res, 500, e, id);
  }
}

async function executeQueuedProposal(id, params, res) {
  try {
    const { executionStrategy, executionParams } = params;
    const receipt = await client.executeQueuedProposal({
      signer: wallet,
      executionStrategy,
      executionParams
    });

    return rpcSuccess(res, receipt, id);
  } catch (e) {
    return rpcError(res, 500, e, id);
  }
}

const fn = { send, execute, executeQueuedProposal };

router.post('/', async (req, res) => {
  const { id, method, params } = req.body;
  return await fn[method](id, params, res);
});

export default router;
