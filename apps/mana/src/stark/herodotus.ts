import fetch from 'cross-fetch';
import { constants } from 'starknet';
import { getClient } from './networks';
import * as db from '../db';

type HerodotusConfig = {
  DESTINATION_CHAIN_ID: string;
  ACCUMULATES_CHAIN_ID: string;
  FEE: string;
};

const HERODOTUS_API_KEY = process.env.HERODOTUS_API_KEY || '';
const HERODOTUS_LEGACY_API_KEY = process.env.HERODOTUS_LEGACY_API_KEY || '';
const HERODOTUS_MAPPING = new Map<string, HerodotusConfig>([
  [
    constants.StarknetChainId.SN_MAIN,
    {
      DESTINATION_CHAIN_ID: 'STARKNET',
      ACCUMULATES_CHAIN_ID: '1',
      FEE: '100000'
    }
  ],
  [
    constants.StarknetChainId.SN_SEPOLIA,
    {
      DESTINATION_CHAIN_ID: 'SN_SEPOLIA',
      ACCUMULATES_CHAIN_ID: '11155111',
      FEE: '0'
    }
  ]
]);

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

function getApi(accumulatesChainId: string) {
  if (accumulatesChainId === '1') {
    return {
      apiUrl: 'https://snapshot.api.herodotus.cloud',
      indexerUrl: 'https://snapshot.rs-indexer.api.herodotus.cloud',
      apiKey: HERODOTUS_LEGACY_API_KEY
    };
  }

  return {
    apiUrl: 'https://api.herodotus.cloud',
    indexerUrl: 'https://rs-indexer.api.herodotus.cloud',
    apiKey: HERODOTUS_API_KEY
  };
}

function getId(proposal: ApiProposal) {
  return `${proposal.chainId}-${proposal.l1TokenAddress}-${proposal.strategyAddress}-${proposal.timestamp}`;
}

async function getStatus(id: string, accumulatesChainId: string) {
  const { apiUrl, apiKey } = getApi(accumulatesChainId);

  const res = await fetch(
    `${apiUrl}/batch-query-status?apiKey=${apiKey}&batchQueryId=${id}`,
    {
      headers: {
        'api-key': apiKey
      }
    }
  );

  const { queryStatus, error } = await res.json();
  if (error) throw new Error(error);

  return queryStatus;
}

async function submitBatch(proposal: ApiProposal) {
  const mapping = HERODOTUS_MAPPING.get(proposal.chainId);
  if (!mapping) throw new Error('Invalid chainId');

  const { DESTINATION_CHAIN_ID, ACCUMULATES_CHAIN_ID, FEE } = mapping;

  const body: any = {
    destinationChainId: DESTINATION_CHAIN_ID,
    fee: FEE,
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

  const { apiUrl, apiKey } = getApi(ACCUMULATES_CHAIN_ID);
  const res = await fetch(`${apiUrl}/submit-batch-query?apiKey=${apiKey}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(body)
  });

  const result = await res.json();

  if (result.error) {
    if (result.error.startsWith('Invalid account address or ENS')) {
      console.log('invalid herodotus batch', result.error);
      return db.markProposalProcessed(getId(proposal));
    }

    throw new Error(result.error);
  }

  console.log('herodotus internalId', result.internalId);

  await db.updateProposal(getId(proposal), {
    herodotusId: result.internalId
  });
}

export async function registerProposal(proposal: ApiProposal) {
  if (
    proposal.chainId !== constants.StarknetChainId.SN_MAIN &&
    proposal.chainId !== constants.StarknetChainId.SN_SEPOLIA
  ) {
    throw new Error('Only Starknet mainnet and sepolia are supported');
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
    if (!l1TokenAddress) throw new Error('Invalid proposal id');

    return submitBatch({
      ...proposal,
      l1TokenAddress
    });
  }

  const { getAccount, herodotusController } = getClient(proposal.chainId);
  const { account, nonceManager } = getAccount('0x0');
  const mapping = HERODOTUS_MAPPING.get(proposal.chainId);
  if (!mapping) throw new Error('Invalid chainId');
  const { DESTINATION_CHAIN_ID, ACCUMULATES_CHAIN_ID } = mapping;

  try {
    const status = await getStatus(proposal.herodotusId, ACCUMULATES_CHAIN_ID);
    if (status !== 'DONE') {
      console.log('proposal is not ready yet', proposal.herodotusId, status);
      return;
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'No query found') {
      console.log('query does not exist', proposal.herodotusId);
      return db.markProposalProcessed(proposal.id);
    }

    throw e;
  }

  const { indexerUrl } = getApi(ACCUMULATES_CHAIN_ID);

  const res = await fetch(
    `${indexerUrl}/remappers/binsearch-path?timestamp=${proposal.timestamp}&deployed_on_chain=${DESTINATION_CHAIN_ID}&accumulates_chain=${ACCUMULATES_CHAIN_ID}`,
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

    const receipt = await herodotusController.cacheTimestamp(
      {
        signer: account,
        contractAddress: proposal.strategyAddress,
        timestamp: proposal.timestamp,
        binaryTree: tree
      },
      { nonce }
    );

    nonceManager.increaseNonce();

    console.log('cached proposal', receipt);

    await db.markProposalProcessed(proposal.id);
  } finally {
    nonceManager.release();
  }
}
