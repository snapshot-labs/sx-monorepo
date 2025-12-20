import { Contract } from '@ethersproject/contracts';
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
import { Response } from 'express';
import { createWalletProxy } from './dependencies';
import { rpcError, rpcSuccess } from '../utils';
import logger from './logger';

const POSTER_CONFIG = {
  contract: '0x000000000000cd17345801aa8147b8D3950260FF',
  abi: ['function post(string calldata content, string calldata tag)']
};

const POSTER_SUPPORTED_NETWORKS = [8453, 11155111] as const;
const BROKESTER_INDEXER_MAPPINGS = {
  8453: 'base',
  11155111: 'sepolia'
} as const satisfies Record<(typeof POSTER_SUPPORTED_NETWORKS)[number], string>;

const BROKESTER_API_URL =
  process.env.BROKESTER_API_URL || 'https://api.brokester.box';

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
  const openZeppelinClient = new clients.OpenZeppelinEthereumTx();
  const governorBravoClient = new clients.GovernorBravoEthereumTx();
  const l1ExecutorClient = new clients.L1Executor();

  async function send(id: number, params: any, res: Response) {
    try {
      const { signatureData } = params.envelope;
      const { types, domain } = signatureData;
      let receipt;

      logger.info({ params }, 'Processing send request');

      if (signatureData.authenticatorType?.startsWith('OpenZeppelin')) {
        const signer = getWallet(domain.verifyingContract);

        receipt = await openZeppelinClient.vote({
          signer,
          envelope: params.envelope
        });
      } else if (signatureData.authenticatorType?.startsWith('GovernorBravo')) {
        const signer = getWallet(domain.verifyingContract);

        receipt = await governorBravoClient.vote({
          signer,
          envelope: params.envelope
        });
      } else {
        const signer = getWallet(params.envelope.data.space);

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
      }

      logger.info({ receipt }, 'Transaction broadcasted successfully');

      return rpcSuccess(res, receipt, id);
    } catch (err) {
      logger.error({ err }, 'Failed to broadcast transaction');
      return rpcError(res, 500, err, id);
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
    } catch (err) {
      logger.error({ err }, 'Failed to finalize proposal');
      return rpcError(res, 500, err, id);
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
    } catch (err) {
      logger.error({ err }, 'Failed to execute proposal');
      return rpcError(res, 500, err, id);
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
    } catch (err) {
      logger.error({ err }, 'Failed to execute queued proposal');
      return rpcError(res, 500, err, id);
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

      // Ape API from Herodotus is down. For now we can skip storing the proposal in the DB.
      // We also need it so we can add proper unique index on apegas_proposals.
      //  await db.saveApeGasProposal({
      //    chainId,
      //    viewId,
      //    snapshot
      //  });

      return rpcSuccess(res, 'success', id);
    } catch (err) {
      logger.error({ err }, 'Failed to register ape gas proposal');
      return rpcError(res, 500, err, id);
    }
  }

  async function postReferral(id: number, params: any, res: Response) {
    try {
      const { metadataUri, posterTag } = params;

      if (!metadataUri || !posterTag) {
        return rpcError(res, 400, 'Missing metadataUri or posterTag', id);
      }

      if (
        !POSTER_SUPPORTED_NETWORKS.includes(
          chainId as (typeof POSTER_SUPPORTED_NETWORKS)[number]
        )
      ) {
        return rpcError(res, 400, 'Unsupported chain', id);
      }

      const ipfsUrl = metadataUri.replace(
        'ipfs://',
        'https://pineapple.fyi/ipfs/'
      );
      const metadataRes = await fetch(ipfsUrl);
      if (!metadataRes.ok) {
        return rpcError(res, 400, 'Failed to fetch IPFS metadata', id);
      }

      const metadata = await metadataRes.json();
      const { signer, message } = metadata;

      if (!signer || !message?.auction_tag) {
        return rpcError(
          res,
          400,
          'Invalid metadata: missing signer or auction_tag',
          id
        );
      }

      const referralId = `${message.auction_tag}/${signer.toLowerCase()}`;

      const indexer =
        BROKESTER_INDEXER_MAPPINGS[
          chainId as keyof typeof BROKESTER_INDEXER_MAPPINGS
        ];

      const response = await fetch(BROKESTER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ referral(indexer: "${indexer}", id: "${referralId}") { id } }`
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.data?.referral) {
          return rpcError(
            res,
            400,
            'Referral already registered for this address',
            id
          );
        }
      }

      const wallet = getWallet('poster');
      const contract = new Contract(
        POSTER_CONFIG.contract,
        POSTER_CONFIG.abi,
        wallet
      );

      const tx = await contract.post(metadataUri, posterTag);

      return rpcSuccess(res, { hash: tx.hash }, id);
    } catch (err) {
      logger.error({ err }, 'Failed to post referral');
      return rpcError(res, 500, err, id);
    }
  }

  return {
    send,
    finalizeProposal,
    execute,
    executeQueuedProposal,
    executeStarknetProposal,
    registerApeGasProposal,
    postReferral,
    getWallet
  };
};
