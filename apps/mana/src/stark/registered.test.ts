import { constants } from 'starknet';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import logger from './logger';
import { getClient } from './networks';
import { registeredTransactionsLoop } from './registered';
import * as db from '../db';
import { sleep } from '../utils';

const mocks = vi.hoisted(() => ({
  getStorageAt: vi.fn(),
  getAccount: vi.fn(),
  propose: vi.fn(),
  updateProposal: vi.fn(),
  vote: vi.fn()
}));

vi.mock('./networks', () => ({
  NETWORKS: new Map([['test-network', {}]]),
  getClient: vi.fn(() => ({
    provider: { getStorageAt: mocks.getStorageAt },
    getAccount: mocks.getAccount,
    client: {
      propose: mocks.propose,
      updateProposal: mocks.updateProposal,
      vote: mocks.vote
    }
  }))
}));
vi.mock('./herodotus', () => ({ processProposal: vi.fn() }));
vi.mock('../db', () => ({
  getTransactionsToProcess: vi.fn(),
  markTransactionProcessed: vi.fn(),
  markOldTransactionsAsProcessed: vi.fn()
}));
vi.mock('../utils', () => ({ sleep: vi.fn() }));
vi.mock('./logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const valid = {
  id: 101,
  network: 'test-network',
  type: 'Vote' as const,
  sender: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  hash: '0x15c3ec5ebb1e82803db2d695eb12a902d5bb0d52c63e1536015e6d3debe70',
  data: {
    space: '0x123',
    authenticator: '0x456',
    strategies: [],
    proposal: 32,
    choice: 1,
    metadataUri: ''
  }
};

const invalid = [
  [
    'observed registration',
    { ...valid, type: 'e001-test', sender: 'e001-test', hash: '0xe001' }
  ],
  ['malformed sender', { ...valid, sender: 'e001-test' }],
  ['malformed hash', { ...valid, hash: '0xinvalid' }],
  [
    'sender field bound',
    { ...valid, sender: `0x${constants.PRIME.toString(16)}` }
  ],
  ['hash field bound', { ...valid, hash: `0x${constants.PRIME.toString(16)}` }],
  ['unsupported type', { ...valid, type: 'Execute' }],
  ['unsupported network', { ...valid, network: 'unsupported' }],
  ['null payload', { ...valid, data: null }],
  ['missing authenticator', { ...valid, data: { space: '0x123' } }],
  ['missing space', { ...valid, data: { authenticator: '0x456' } }],
  [
    'invalid authenticator',
    { ...valid, data: { ...valid.data, authenticator: 'invalid' } }
  ],
  ['invalid space', { ...valid, data: { ...valid.data, space: 'invalid' } }]
] as const;

const stop = new Error('end of test iteration');

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getClient).mockReturnValue({
    provider: { getStorageAt: mocks.getStorageAt },
    getAccount: mocks.getAccount,
    client: {
      propose: mocks.propose,
      updateProposal: mocks.updateProposal,
      vote: mocks.vote
    }
  } as unknown as ReturnType<typeof getClient>);
  mocks.getStorageAt.mockResolvedValue('0x1');
  mocks.getAccount.mockReturnValue({ account: 'offline-account' });
  mocks.propose.mockResolvedValue({ transaction_hash: '0xpropose' });
  mocks.updateProposal.mockResolvedValue({ transaction_hash: '0xupdate' });
  mocks.vote.mockResolvedValue({ transaction_hash: '0xvote' });
  vi.mocked(db.getTransactionsToProcess).mockResolvedValue([]);
  vi.mocked(sleep).mockRejectedValue(stop);
});

async function iteration() {
  await expect(registeredTransactionsLoop()).rejects.toBe(stop);
  expect(sleep).toHaveBeenCalledWith(15_000);
}

describe('registered transaction queue', () => {
  it.each(invalid)(
    'retains %s as failed and still processes the following row',
    async (_, transaction) => {
      const rows = [
        { ...transaction, processed: false, failed: false },
        { ...valid, id: 102, processed: false, failed: false }
      ];
      vi.mocked(db.getTransactionsToProcess).mockImplementation(async () =>
        rows.filter(row => !row.processed)
      );
      vi.mocked(db.markTransactionProcessed).mockImplementation(
        async (id, { failed = false } = {}) => {
          const row = rows.find(row => row.id === id);
          if (!row) throw new Error('Missing test row');
          row.processed = true;
          row.failed = failed;
          return 1;
        }
      );

      await iteration();
      await iteration();

      expect(rows[0]).toEqual({
        ...transaction,
        processed: true,
        failed: true
      });
      expect(rows[1]).toEqual({
        ...valid,
        id: 102,
        processed: true,
        failed: false
      });
      expect(db.markTransactionProcessed).toHaveBeenCalledTimes(2);
      expect(db.markOldTransactionsAsProcessed).toHaveBeenCalledTimes(2);
      expect(getClient).toHaveBeenCalledTimes(1);
      expect(mocks.vote).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        { transactionId: transaction.id },
        'Marked invalid registered transaction as failed'
      );
    }
  );

  it.each(['Propose', 'UpdateProposal', 'Vote'] as const)(
    'broadcasts a valid historical %s row',
    async type => {
      vi.mocked(db.getTransactionsToProcess).mockResolvedValue([
        { ...valid, type, sender: 'e001', hash: '0001' }
      ]);
      await iteration();
      const method = {
        Propose: mocks.propose,
        UpdateProposal: mocks.updateProposal,
        Vote: mocks.vote
      }[type];
      expect(method).toHaveBeenCalledWith('offline-account', {
        signatureData: { address: 'e001' },
        data: valid.data
      });
      expect(db.markTransactionProcessed).toHaveBeenCalledWith(valid.id, {
        failed: false
      });
    }
  );

  it('keeps an uncommitted transaction pending', async () => {
    vi.mocked(db.getTransactionsToProcess).mockResolvedValue([valid]);
    mocks.getStorageAt.mockResolvedValue('0x0');
    await iteration();
    expect(mocks.getAccount).not.toHaveBeenCalled();
    expect(mocks.vote).not.toHaveBeenCalled();
    expect(db.markTransactionProcessed).not.toHaveBeenCalled();
  });

  it('retries storage-provider failures without dropping the row or blocking its neighbor', async () => {
    vi.mocked(db.getTransactionsToProcess).mockResolvedValue([
      valid,
      { ...valid, id: 102 }
    ]);
    mocks.getStorageAt.mockRejectedValueOnce(new Error('provider unavailable'));
    await iteration();
    expect(db.markTransactionProcessed).toHaveBeenCalledTimes(1);
    expect(db.markTransactionProcessed).toHaveBeenCalledWith(102, {
      failed: false
    });
    expect(logger.error).toHaveBeenCalledWith(
      { transactionId: valid.id },
      'Failed to process registered transaction; retrying'
    );

    vi.mocked(db.getTransactionsToProcess).mockResolvedValue([valid]);
    await iteration();
    expect(db.markTransactionProcessed).toHaveBeenLastCalledWith(valid.id, {
      failed: false
    });
  });

  it('does not use the broadcast failure limit for pre-broadcast network failures', async () => {
    vi.mocked(db.getTransactionsToProcess).mockResolvedValue([
      { ...valid, id: 103 }
    ]);
    mocks.getStorageAt.mockRejectedValue(new Error('provider unavailable'));
    await iteration();
    await iteration();
    await iteration();
    expect(db.markTransactionProcessed).not.toHaveBeenCalled();
    mocks.getStorageAt.mockResolvedValue('0x1');
    await iteration();
    expect(db.markTransactionProcessed).toHaveBeenCalledWith(103, {
      failed: false
    });
  });

  it('isolates account preparation errors before broadcasting', async () => {
    vi.mocked(db.getTransactionsToProcess).mockResolvedValue([
      valid,
      { ...valid, id: 102 }
    ]);
    mocks.getAccount.mockImplementationOnce(() => {
      throw new Error('account preparation failed');
    });
    await iteration();
    expect(db.markTransactionProcessed).toHaveBeenCalledTimes(1);
    expect(db.markTransactionProcessed).toHaveBeenCalledWith(102, {
      failed: false
    });
  });

  it('retries a failed invalid-row state update without blocking the next row', async () => {
    vi.mocked(db.getTransactionsToProcess).mockResolvedValue([
      { ...valid, sender: 'e001-test' },
      { ...valid, id: 102 }
    ]);
    vi.mocked(db.markTransactionProcessed).mockRejectedValueOnce(
      new Error('database unavailable')
    );
    await iteration();
    expect(db.markTransactionProcessed).toHaveBeenNthCalledWith(1, valid.id, {
      failed: true
    });
    expect(db.markTransactionProcessed).toHaveBeenNthCalledWith(2, 102, {
      failed: false
    });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      { transactionId: valid.id },
      'Failed to process registered transaction; retrying'
    );
    await iteration();
    expect(logger.warn).toHaveBeenCalledWith(
      { transactionId: valid.id },
      'Marked invalid registered transaction as failed'
    );
  });

  it('retries queue-read failures on the next iteration', async () => {
    vi.mocked(db.getTransactionsToProcess)
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValue([valid]);
    vi.mocked(sleep).mockResolvedValueOnce(undefined);
    await iteration();
    expect(db.getTransactionsToProcess).toHaveBeenCalledTimes(2);
    expect(db.markTransactionProcessed).toHaveBeenCalledWith(valid.id, {
      failed: false
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to process registered transaction queue; retrying'
    );
  });

  it('retries cleanup failures instead of terminating the loop', async () => {
    vi.mocked(db.markOldTransactionsAsProcessed).mockRejectedValueOnce(
      new Error('database unavailable')
    );
    vi.mocked(sleep).mockResolvedValueOnce(undefined);
    await iteration();
    expect(db.markOldTransactionsAsProcessed).toHaveBeenCalledTimes(2);
  });

  it('preserves the existing three-attempt broadcast failure limit', async () => {
    vi.mocked(db.getTransactionsToProcess).mockResolvedValue([
      { ...valid, id: 104 }
    ]);
    mocks.vote.mockRejectedValue(new Error('broadcast rejected'));
    await iteration();
    await iteration();
    expect(db.markTransactionProcessed).not.toHaveBeenCalled();
    await iteration();
    expect(db.markTransactionProcessed).toHaveBeenCalledExactlyOnceWith(104, {
      failed: true
    });
  });
});
