import { utils } from '@snapshot-labs/sx';
import { processProposal } from './herodotus';
import { getClient, NETWORKS } from './networks';
import { registeredTransactionSchema } from './transaction';
import * as db from '../db';
import { sleep } from '../utils';
import logger from './logger';

const INTERVAL = 15_000;

type Transaction = {
  id: number;
  network: string;
  type: 'Propose' | 'UpdateProposal' | 'Vote';
  sender: string;
  hash: string;
  data: any;
};

const failedCounter: Record<string, number | undefined> = {};

async function processTransaction(transaction: Transaction) {
  const parsed = registeredTransactionSchema.safeParse({
    ...transaction,
    payload: transaction.data
  });
  if (!parsed.success || !NETWORKS.has(transaction.network)) {
    await db.markTransactionProcessed(transaction.id, { failed: true });
    logger.warn(
      { transactionId: transaction.id },
      'Marked invalid registered transaction as failed'
    );
    return;
  }

  const storageAddress = utils.encoding.getStorageVarAddress(
    '_commits',
    transaction.hash,
    transaction.sender
  );

  const { provider, getAccount, client } = getClient(transaction.network);
  const value = await provider.getStorageAt(
    transaction.data.authenticator,
    storageAddress
  );
  if (value === '0x0') return;

  const payload = {
    signatureData: {
      address: transaction.sender
    },
    data: transaction.data
  };

  const account = getAccount(payload.data.space).account;

  let receipt;
  try {
    if (transaction.type === 'Propose') {
      receipt = await client.propose(account, payload);
    } else if (transaction.type === 'UpdateProposal') {
      receipt = await client.updateProposal(account, payload);
    } else if (transaction.type === 'Vote') {
      receipt = await client.vote(account, payload);
    }

    logger.info({ receipt }, 'Transaction broadcasted successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to broadcast transaction');

    failedCounter[transaction.id] = (failedCounter[transaction.id] || 0) + 1;
  }

  const failed = (failedCounter[transaction.id] || 0) >= 3;
  if (receipt || failed) {
    delete failedCounter[transaction.id];

    await db.markTransactionProcessed(transaction.id, { failed });
  }
}

export async function registeredTransactionsLoop() {
  while (true) {
    try {
      const transactions = await db.getTransactionsToProcess();

      logger.info({ count: transactions.length }, 'Processing transactions');

      for (const transaction of transactions) {
        try {
          await processTransaction(transaction);
        } catch {
          logger.error(
            { transactionId: transaction.id },
            'Failed to process registered transaction; retrying'
          );
        }
      }

      await db.markOldTransactionsAsProcessed();
    } catch {
      logger.error('Failed to process registered transaction queue; retrying');
    }

    await sleep(INTERVAL);
  }
}

export async function registeredProposalsLoop() {
  while (true) {
    const proposals = await db.getProposalsToProcess();

    logger.info({ count: proposals.length }, 'Processing proposals');

    for (const proposal of proposals) {
      try {
        await processProposal(proposal);
      } catch (err) {
        logger.error({ err, proposal }, 'Failed to process proposal');
      }
    }

    await sleep(INTERVAL);
  }
}
