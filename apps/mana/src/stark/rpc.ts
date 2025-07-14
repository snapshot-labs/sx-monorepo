import { utils } from '@snapshot-labs/sx';
import { Response } from 'express';
import * as herodotus from './herodotus';
import { getClient, NETWORKS } from './networks';
import * as db from '../db';
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

      const { account, nonceManager, deployAccount } = getAccount(data.space);

      console.time('Send');
      console.log('Type', primaryType);
      console.log('Address', address);
      console.log('Message', message);

      await deployAccount();

      try {
        await nonceManager.acquire();
        const nonce = await nonceManager.getNonce();

        if (primaryType === 'Propose') {
          console.log('Propose');
          receipt = await client.propose(account, params.envelope, { nonce });
        } else if (primaryType === 'UpdateProposal') {
          console.log('UpdateProposal');
          receipt = await client.updateProposal(account, params.envelope, {
            nonce
          });
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

  async function execute(id: number, params: any, res: Response) {
    try {
      const { space, proposalId, executionParams } = params;
      const { account, nonceManager, deployAccount } = getAccount(space);

      await deployAccount();

      let receipt;
      try {
        await nonceManager.acquire();
        const nonce = await nonceManager.getNonce();

        receipt = await client.execute(
          {
            signer: account,
            space,
            proposalId,
            executionPayload: executionParams
          },
          { nonce }
        );
      } finally {
        nonceManager.release();
      }

      return rpcSuccess(res, receipt, id);
    } catch (e) {
      return rpcError(res, 500, e, id);
    }
  }

  async function registerTransaction(id: number, params: any, res: Response) {
    try {
      const { type, sender, hash, payload } = params;

      console.log('Registering transaction', type, sender, hash, payload);

      await db.registerTransaction(chainId, type, sender, hash, payload);

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

      console.log(
        'Registering proposal',
        l1TokenAddress,
        strategyAddress,
        snapshotTimestamp
      );

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

  async function getDataByMessageHash(id: number, params: any, res: Response) {
    try {
      const { hash } = params;

      const transaction = await db.getDataByMessageHash(hash);

      return rpcSuccess(res, transaction, id);
    } catch (e) {
      console.log('Failed', e);
      return rpcError(res, 500, e, id);
    }
  }

  async function generateTree(requestId: string, entries: string[]) {
    const tree = await utils.merkle.generateMerkleTree(entries);
    const root = tree[0];
    if (!root) throw new Error('Merkle tree not generated');

    await db.saveMerkleTree(requestId, root, tree);
  }

  async function generateMerkleTree(id: number, params: any, res: Response) {
    try {
      const { entries } = params;

      const requestId = crypto.randomUUID();

      await db.saveRequest(requestId);

      // NOTE: no await here as we want to execute it in the background
      generateTree(requestId, entries);

      return rpcSuccess(res, requestId, id);
    } catch (e) {
      console.log('Failed', e);
      return rpcError(res, 500, e, id);
    }
  }

  async function getMerkleRoot(id: number, params: any, res: Response) {
    try {
      const { requestId } = params;

      const request = await db.getMerkleTreeRequest(requestId);
      if (!request) throw new Error('Request not found');

      return rpcSuccess(res, request.root, id);
    } catch (e) {
      console.log('Failed', e);
      return rpcError(res, 500, e, id);
    }
  }

  async function getMerkleProof(id: number, params: any, res: Response) {
    try {
      const { root, index } = params;

      const result = await db.getMerkleTree(root);
      if (!result) throw new Error('Merkle tree not generated');

      const proof = utils.merkle.generateMerkleProof(result.tree, index);

      return rpcSuccess(res, proof, id);
    } catch (e) {
      console.log('Failed', e);
      return rpcError(res, 500, e, id);
    }
  }

  return {
    send,
    execute,
    registerTransaction,
    registerProposal,
    getAccount,
    getDataByMessageHash,
    generateMerkleTree,
    getMerkleRoot,
    getMerkleProof
  };
};
