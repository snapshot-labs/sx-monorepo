import fetch from 'cross-fetch';
import { Account, constants } from 'starknet';
import { clients } from '@snapshot-labs/sx';

const controller = new clients.HerodotusController();

const WEBHOOK_ENABLED = process.env.WEBHOOK_ENABLED;
const WEBHOOK_BASE_URL =
  process.env.WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const WEBHOOK_KEY = process.env.WEBHOOK_KEY || '212121424242';

export async function registerProposal({
  chainId,
  l1TokenAddress,
  strategyAddress,
  snapshotTimestamp
}: {
  chainId: string;
  l1TokenAddress: string;
  strategyAddress: string;
  snapshotTimestamp: number;
}) {
  const webhookUrl = `${WEBHOOK_BASE_URL}/stark_rpc/${chainId}/storage-webhook?timestamp=${snapshotTimestamp}&strategyAddress=${strategyAddress}&key=${WEBHOOK_KEY}`;

  if (chainId !== constants.StarknetChainId.SN_GOERLI) {
    throw new Error('Only Starknet goerli is supported');
  }

  const body: any = {
    destinationChainId: 'SN_GOERLI',
    fee: '0',
    data: {
      '5': {
        [`timestamp:${snapshotTimestamp}`]: {
          accounts: {
            [l1TokenAddress]: {
              props: ['STORAGE_ROOT']
            }
          }
        }
      }
    }
  };

  if (WEBHOOK_ENABLED) {
    body.webhook = {
      url: webhookUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } else {
    console.log('WARN! webhooks disabled');
    console.log('you will need to manually inform server about new storage root being accepted');
  }

  console.log('Webhook URL', webhookUrl);

  const res = await fetch(
    `https://api.herodotus.cloud/submit-batch-query?apiKey=${process.env.HERODOTUS_API_KEY}`,
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  const result = await res.json();

  console.log('herodotus internalId', result.internalId);

  return result;
}

export async function handleStorageWebhook({
  account,
  timestamp,
  strategyAddress,
  key
}: {
  account: Account;
  timestamp: number;
  strategyAddress: string;
  key: string;
}) {
  if (key !== WEBHOOK_KEY) throw new Error('Invalid key');

  const res = await fetch(
    `https://ds-indexer.api.herodotus.cloud/binsearch-path?timestamp=${timestamp}&deployed_on_chain=SN_GOERLI&accumulates_chain=5`,
    {
      headers: {
        accept: 'application/json'
      }
    }
  );

  const tree = await res.json();

  return controller.cacheTimestamp({
    signer: account,
    contractAddress: strategyAddress,
    timestamp,
    binaryTree: tree
  });
}
