import express from 'express';
import { clients } from '@snapshot-labs/sx';
import { getWallet } from './dependencies';
import { rpcError, rpcSuccess } from '../utils';

const client = new clients.EvmEthereumTx();

const router = express.Router();

async function send(id, params, res) {
  try {
    const { signatureData, data } = params.envelope;
    const { types } = signatureData;
    let receipt;

    const signer = getWallet(params.envelope.data.space);

    console.time('Send');
    console.log('Types', types);
    console.log('Message', data);

    if (types.Propose) {
      receipt = await client.propose({
        signer,
        envelope: params.envelope
      });
    } else if (types.updateProposal) {
      receipt = await client.updateProposal({
        signer,
        envelope: params.envelope
      });
    } else if (types.Vote) {
      receipt = await client.vote({
        signer,
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
    const signer = getWallet(space);

    const receipt = await client.execute({
      signer,
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
    const { space, executionStrategy, executionParams } = params;
    const signer = getWallet(space);

    const receipt = await client.executeQueuedProposal({
      signer,
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
