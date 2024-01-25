import fetch from 'cross-fetch';
import { constants } from 'starknet';
import { clients } from '@snapshot-labs/sx';
import * as db from '../db';
import { getClient } from './networks';

const HERODOTUS_API_KEY = process.env.HERODOTUS_API_KEY || '';
const HERODOTUS_MAPPING = {
  [constants.StarknetChainId.SN_GOERLI]: {
    DESTINATION_CHAIN_ID: 'SN_GOERLI',
    ACCUMULATES_CHAIN_ID: '5'
  },
  [constants.StarknetChainId.SN_SEPOLIA]: {
    DESTINATION_CHAIN_ID: 'SN_SEPOLIA',
    ACCUMULATES_CHAIN_ID: '11155111'
  }
};

const controller = new clients.HerodotusController();

type ApiProposal = {
  chainId: string;
  l1TokenAddress: string;
  timestamp: number;
  strategyAddress: string;
};

type DbProposal = {
  id: string;
  chainId: string;
  timestamp: number;
  strategyAddress: string;
  herodotusId: string | null;
};

function getId(proposal: ApiProposal) {
  return `${proposal.chainId}-${proposal.l1TokenAddress}-${proposal.strategyAddress}-${proposal.timestamp}`;
}

async function getStatus(id: string) {
  const res = await fetch(
    `https://api.herodotus.cloud/batch-query-status?apiKey=${HERODOTUS_API_KEY}&batchQueryId=${id}`
  );

  const { queryStatus } = await res.json();

  return queryStatus;
}

async function submitBatch(proposal: ApiProposal) {
  const mapping = HERODOTUS_MAPPING[proposal.chainId];
  if (!mapping) throw new Error('Invalid chainId');

  const { DESTINATION_CHAIN_ID, ACCUMULATES_CHAIN_ID } = mapping;

  const body: any = {
    destinationChainId: DESTINATION_CHAIN_ID,
    fee: '0',
    data: {
      [ACCUMULATES_CHAIN_ID]: {
        [`timestamp:${proposal.timestamp}`]: {
          accounts: {
            [proposal.l1TokenAddress]: {
              props: ['STORAGE_ROOT']
            }
          }
        }
      }
    }
  };

  const res = await fetch(
    `https://api.herodotus.cloud/submit-batch-query?apiKey=${HERODOTUS_API_KEY}`,
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  const result = await res.json();

  if (!result.internalId) {
    throw new Error('registration failed');
  }

  console.log('herodotus internalId', result.internalId);

  await db.updateProposal(getId(proposal), {
    herodotusId: result.internalId
  });
}

export async function registerProposal(proposal: ApiProposal) {
  if (
    proposal.chainId !== constants.StarknetChainId.SN_GOERLI &&
    proposal.chainId !== constants.StarknetChainId.SN_SEPOLIA
  ) {
    throw new Error('Only Starknet goerli and sepolia are supported');
  }

  await db.registerProposal(getId(proposal), {
    chainId: proposal.chainId,
    timestamp: proposal.timestamp,
    strategyAddress: proposal.strategyAddress,
    herodotusId: null
  });

  try {
    await submitBatch(proposal);
  } catch (e) {
    console.log('failed to submit batch', e);
  }
}

export async function processProposal(proposal: DbProposal) {
  if (!proposal.herodotusId) {
    const [, l1TokenAddress] = proposal.id.split('-');

    await submitBatch({
      ...proposal,
      l1TokenAddress
    });

    return;
  }

  const status = await getStatus(proposal.herodotusId);
  if (status !== 'DONE') {
    console.log('proposal is not ready yet', proposal.herodotusId, status);
    return;
  }

  const { getAccount } = getClient(proposal.chainId);
  const { account, nonceManager } = getAccount('0x0');
  const mapping = HERODOTUS_MAPPING[proposal.chainId];
  if (!mapping) throw new Error('Invalid chainId');

  const { DESTINATION_CHAIN_ID, ACCUMULATES_CHAIN_ID } = mapping;

  const res = await fetch(
    `https://ds-indexer.api.herodotus.cloud/binsearch-path?timestamp=${proposal.timestamp}&deployed_on_chain=${DESTINATION_CHAIN_ID}&accumulates_chain=${ACCUMULATES_CHAIN_ID}`,
    {
      headers: {
        accept: 'application/json'
      }
    }
  );

  const tree = await res.json();

  try {
    await nonceManager.acquire();
    const nonce = await nonceManager.getNonce();

    const receipt = await controller.cacheTimestamp(
      {
        signer: account,
        contractAddress: proposal.strategyAddress,
        timestamp: proposal.timestamp,
        binaryTree: tree
      },
      { nonce }
    );

    console.log('cached proposal', receipt);

    await db.markProposalProcessed(proposal.id);
  } finally {
    nonceManager.release();
  }
}
