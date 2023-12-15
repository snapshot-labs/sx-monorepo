import { utils } from '@snapshot-labs/sx';
import * as db from '../db';
import { sleep } from '../utils';
import { getClient } from './networks';

const INTERVAL = 15_000;

type Transaction = {
  id: number;
  network: string;
  type: 'Propose' | 'UpdateProposal' | 'Vote';
  hash: string;
  data: any;
};

const failedCounter: Record<string, number | undefined> = {};

async function processTransaction(transaction: Transaction) {
  const storageAddress = utils.encoding.getStorageVarAddress('_commits', transaction.hash);

  const { provider, getAccount, client } = getClient(transaction.network);
  const value = await provider.getStorageAt(transaction.data.authenticator, storageAddress);
  if (value === '0x0') return;

  const payload = {
    signatureData: {
      address: value
    },
    data: transaction.data
  };

  const account = getAccount(payload.data.space);

  let receipt;
  try {
    if (transaction.type === 'Propose') {
      receipt = await client.propose(account, payload);
    } else if (transaction.type === 'UpdateProposal') {
      receipt = await client.updateProposal(account, payload);
    } else if (transaction.type === 'Vote') {
      receipt = await client.vote(account, payload);
    } else {
      console.log('skipped unknown transaction type');
    }

    console.log('receipt', receipt);
  } catch (e) {
    console.log('error', e);

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
    const transactions = await db.getTransactionsToProcess();

    console.log('processing', transactions.length, 'transactions');

    for (const transaction of transactions) {
      await processTransaction(transaction);
    }

    await db.markOldTransactionsAsProcessed();
    await sleep(INTERVAL);
  }
}
