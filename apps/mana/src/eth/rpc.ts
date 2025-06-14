import {
  clients,
  evmApe,
  evmArbitrum,
  evmBase,
  evmCurtis,
  evmMainnet,
  evmMantle,
  EvmNetworkConfig,
  evmNetworks,
  evmOptimism,
  evmPolygon,
  evmSepolia
} from '@snapshot-labs/sx';
import fetch from 'cross-fetch';
import { Response } from 'express';
import { createWalletProxy } from './dependencies';
import * as db from '../db';
import { rpcError, rpcSuccess } from '../utils';

const NETWORKS = new Map<number, EvmNetworkConfig>([
  [10, evmOptimism],
  [137, evmPolygon],
  [8453, evmBase],
  [5000, evmMantle],
  [42161, evmArbitrum],
  [1, evmMainnet],
  [33139, evmApe],
  [33111, evmCurtis],
  [11155111, evmSepolia]
]);

export const NETWORK_IDS = new Map<number, string>(
  Object.entries(evmNetworks).map(([networkId, config]) => [
    config.Meta.eip712ChainId,
    networkId
  ])
);

export const createNetworkHandler = (chainId: number) => {
  const networkConfig = NETWORKS.get(chainId);
  if (!networkConfig) throw new Error('Unsupported chainId');

  const { provider, getWallet } = createWalletProxy(chainId);

  const client = new clients.EvmEthereumTx({
    networkConfig,
    whitelistServerUrl: 'https://wls.snapshot.box',
    provider
  });
  const l1ExecutorClient = new clients.L1Executor();

  async function send(id: number, params: any, res: Response) {
    try {
      const { signatureData, data } = params.envelope;
      const { types } = signatureData;
      let receipt;

      const signer = getWallet(params.envelope.data.space);

      console.log('params', JSON.stringify(params));

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

  async function finalizeProposal(id: number, params: any, res: Response) {
    try {
      const { space, proposalId } = params;

      const response = await fetch(
        'http://ec2-44-197-171-215.compute-1.amazonaws.com:8000/query',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId,
            space,
            proposalId,
            feeData: {
              maxFeePerGas: '50000000000'
            }
          })
        }
      );

      const result = await response.text();

      return rpcSuccess(res, result, id);
    } catch (e) {
      return rpcError(res, 500, e, id);
    }
  }

  async function execute(id: number, params: any, res: Response) {
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

  async function executeQueuedProposal(id: number, params: any, res: Response) {
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

  async function executeStarknetProposal(
    id: number,
    params: any,
    res: Response
  ) {
    try {
      const {
        space,
        executor,
        proposalId,
        proposal,
        votesFor,
        votesAgainst,
        votesAbstain,
        executionHash,
        transactions
      } = params;
      const signer = getWallet(space);

      const receipt = await l1ExecutorClient.execute({
        signer,
        space,
        executor,
        proposalId,
        proposal,
        votesFor,
        votesAgainst,
        votesAbstain,
        executionHash,
        transactions
      });

      return rpcSuccess(res, receipt, id);
    } catch (e) {
      return rpcError(res, 500, e, id);
    }
  }

  async function registerApeGasProposal(
    id: number,
    params: any,
    res: Response
  ) {
    try {
      const { viewId, snapshot } = params;

      if (!viewId || !snapshot) {
        return rpcError(res, 400, 'Missing viewId or snapshot', id);
      }

      await db.saveApeGasProposal({
        chainId,
        viewId,
        snapshot
      });

      return rpcSuccess(res, 'success', id);
    } catch (e) {
      console.log('Error registering ApeGas proposal:', e);
      return rpcError(res, 500, e, id);
    }
  }

  return {
    send,
    finalizeProposal,
    execute,
    executeQueuedProposal,
    executeStarknetProposal,
    registerApeGasProposal
  };
};
