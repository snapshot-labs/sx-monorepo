import { Response } from 'express';
import { NETWORKS, getClient } from './networks';
import * as db from '../db';
import * as herodotus from './herodotus';
import { rpcError, rpcSuccess } from '../utils';

export const createNetworkHandler = (chainId: string) => {
  const networkConfig = NETWORKS.get(chainId);
  if (!networkConfig) throw new Error('Unsupported chainId');

  const { client, getAccount } = getClient(chainId);

  async function send(id: number, params: any, res: Response) {
    try {
      const { signatureData, data } = params.envelope;
      const { address, primaryType, message } = signatureData;
      let receipt;

      const { account, nonceManager } = getAccount(data.space);

      console.time('Send');
      console.log('Type', primaryType);
      console.log('Address', address);
      console.log('Message', message);

      try {
        await nonceManager.acquire();
        const nonce = await nonceManager.getNonce();

        if (primaryType === 'Propose') {
          console.log('Propose');
          receipt = await client.propose(account, params.envelope, { nonce });
        } else if (primaryType === 'UpdateProposal') {
          console.log('Propose');
          receipt = await client.propose(account, params.envelope, { nonce });
        } else if (primaryType === 'Vote') {
          console.log('Vote');
          receipt = await client.vote(account, params.envelope, { nonce });
        }

        nonceManager.increaseNonce();
      } finally {
        nonceManager.release();
      }

      console.timeEnd('Send');
      console.log('Receipt', receipt);

      return rpcSuccess(res, receipt, id);
    } catch (e) {
      console.log('Failed', e);
      return rpcError(res, 500, e, id);
    }
  }

  async function registerTransaction(id: number, params: any, res: Response) {
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

  async function registerProposal(id: number, params: any, res: Response) {
    try {
      const { l1TokenAddress, strategyAddress, snapshotTimestamp } = params;

      const alreadyRegistered = await db.getProposal(
        `${chainId}-${l1TokenAddress}-${strategyAddress}-${snapshotTimestamp}`
      );
      if (alreadyRegistered) {
        return rpcSuccess(
          res,
          {
            alreadyRegistered: true
          },
          id
        );
      }

      console.log('Registering proposal', l1TokenAddress, strategyAddress, snapshotTimestamp);

      await herodotus.registerProposal({
        chainId,
        l1TokenAddress,
        strategyAddress,
        timestamp: snapshotTimestamp
      });

      return rpcSuccess(res, { success: true }, id);
    } catch (e) {
      console.log('Failed', e);
      return rpcError(res, 500, e, id);
    }
  }

  return { send, registerTransaction, registerProposal, getAccount };
};
