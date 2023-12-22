import fetch from 'cross-fetch';
import { constants } from 'starknet';
import { clients } from '@snapshot-labs/sx';
import * as db from '../db';
import { getClient } from './networks';

const HERODOTUS_API_KEY = process.env.HERODOTUS_API_KEY || '';

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
  const body: any = {
    destinationChainId: 'SN_GOERLI',
    fee: '0',
    data: {
      '5': {
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
  if (proposal.chainId !== constants.StarknetChainId.SN_GOERLI) {
    throw new Error('Only Starknet goerli is supported');
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
  const account = getAccount('0x0');

  const res = await fetch(
    `https://ds-indexer.api.herodotus.cloud/binsearch-path?timestamp=${proposal.timestamp}&deployed_on_chain=SN_GOERLI&accumulates_chain=5`,
    {
      headers: {
        accept: 'application/json'
      }
    }
  );

  const tree = await res.json();

  const receipt = await controller.cacheTimestamp({
    signer: account,
    contractAddress: proposal.strategyAddress,
    timestamp: proposal.timestamp,
    binaryTree: tree
  });

  console.log('cached proposal', receipt);

  await db.markProposalProcessed(proposal.id);
}
