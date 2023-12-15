import { NETWORKS, getClient } from './networks';
import * as db from '../db';
import { rpcError, rpcSuccess } from '../utils';

export const createNetworkHandler = (chainId: string) => {
  const networkConfig = NETWORKS[chainId];
  if (!networkConfig) throw new Error('Unsupported chainId');

  const { client, getAccount } = getClient(chainId);

  async function send(id, params, res) {
    try {
      const { signatureData, data } = params.envelope;
      const { address, primaryType, message } = signatureData;
      let receipt;

      const account = getAccount(data.space);

      console.time('Send');
      console.log('Type', primaryType);
      console.log('Address', address);
      console.log('Message', message);

      if (primaryType === 'Propose') {
        console.log('Propose');
        receipt = await client.propose(account, params.envelope);
      } else if (primaryType === 'UpdateProposal') {
        console.log('Propose');
        receipt = await client.propose(account, params.envelope);
      } else if (primaryType === 'Vote') {
        console.log('Vote');
        receipt = await client.vote(account, params.envelope);
      }

      console.timeEnd('Send');
      console.log('Receipt', receipt);

      return rpcSuccess(res, receipt, id);
    } catch (e) {
      console.log('Failed', e);
      return rpcError(res, 500, e, id);
    }
  }

  async function registerTransaction(id, params, res) {
    try {
      const { type, hash, payload } = params;

      console.log('Registering transaction', type, hash, payload);

      await db.registerTransaction(chainId, type, hash, payload);

      return rpcSuccess(res, true, id);
    } catch (e) {
      console.log('Failed', e);
      return rpcError(res, 500, e, id);
    }
  }

  return { send, registerTransaction };
};
