import { clients, evmGoerli, evmSepolia, evmLineaGoerli } from '@snapshot-labs/sx';
import { createWalletProxy } from './dependencies';
import { rpcError, rpcSuccess } from '../utils';

export const NETWORKS = {
  5: evmGoerli,
  11155111: evmSepolia,
  59140: evmLineaGoerli
} as const;

export const createNetworkHandler = (chainId: number) => {
  const networkConfig = NETWORKS[chainId];
  if (!networkConfig) throw new Error('Unsupported chainId');

  const getWallet = createWalletProxy(process.env.ETH_MNEMONIC || '', chainId);

  const client = new clients.EvmEthereumTx({ networkConfig: networkConfig });

  async function send(id, params, res) {
    console.log('networkConfig', networkConfig);

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

  return { send, execute, executeQueuedProposal };
};
