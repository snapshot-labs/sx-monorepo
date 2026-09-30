import { once } from 'node:events';
import { Server } from 'node:http';
import express from 'express';
import { expect, it, vi } from 'vitest';
import * as db from './db';
import * as registered from './stark/registered';
import * as utils from './utils';

const mocks = vi.hoisted(() => ({ vote: vi.fn() }));

vi.mock('./constants', () => ({ PORT: 0 }));
vi.mock('./eth', async () => {
  const { default: express } = await import('express');
  return { default: express.Router() };
});
vi.mock('./eth/registered', () => ({ registeredApeGasProposalsLoop: vi.fn() }));
vi.mock('./stark/registered', async importOriginal => ({
  ...(await importOriginal<typeof registered>()),
  registeredProposalsLoop: vi.fn()
}));
vi.mock('./stark/networks', () => ({
  NETWORKS: new Map([['test-network', {}]]),
  NETWORK_IDS: new Map([['test-network', 'test-network']]),
  getClient: vi.fn(() => ({
    provider: { getStorageAt: vi.fn().mockResolvedValue('0x1') },
    getAccount: vi.fn(() => ({ account: 'offline-account' })),
    client: { vote: mocks.vote }
  }))
}));
vi.mock('./stark/dependencies', () => ({
  generateSpaceStarknetWallet: vi.fn()
}));
vi.mock('./stark/herodotus', () => ({ processProposal: vi.fn() }));
vi.mock('./db', () => ({
  getTransactionsToProcess: vi.fn(),
  markTransactionProcessed: vi.fn(),
  markOldTransactionsAsProcessed: vi.fn()
}));
vi.mock('./utils', async importOriginal => ({
  ...(await importOriginal<typeof utils>()),
  sleep: vi.fn(() => new Promise(() => {}))
}));
vi.mock('./logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), fatal: vi.fn() }
}));
vi.mock('./stark/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

it('starts and keeps serving HTTP after isolating a malformed stored registration', async () => {
  vi.stubEnv('WALLET_SECRET', 'offline-test-only');
  vi.stubEnv('COMMIT_HASH', '');
  const batch = Promise.withResolvers<void>();
  const invalid = {
    id: 1,
    network: 'test-network',
    type: 'e001-test',
    sender: 'e001-test',
    hash: '0xe001',
    data: { secret: 'never-log-this' }
  };
  const valid = {
    id: 2,
    network: 'test-network',
    type: 'Vote',
    sender: '0x123',
    hash: '0xe002',
    data: { space: '0x123', authenticator: '0x456' }
  };
  vi.mocked(db.getTransactionsToProcess).mockResolvedValue([invalid, valid]);
  vi.mocked(db.markOldTransactionsAsProcessed).mockImplementation(async () => {
    batch.resolve();
    return 1;
  });
  mocks.vote.mockResolvedValue({ transaction_hash: '0x789' });
  const listen = vi.spyOn(express.application, 'listen');
  const originalListeners = process.listeners('uncaughtException');
  let server: Server | undefined;

  try {
    await import('./index.js');
    server = listen.mock.results[0]?.value as Server | undefined;
    if (!server) throw new Error('Server did not start');
    if (!server.listening) await once(server, 'listening');
    await batch.promise;
    expect(db.markTransactionProcessed).toHaveBeenNthCalledWith(1, 1, {
      failed: true
    });
    expect(db.markTransactionProcessed).toHaveBeenNthCalledWith(2, 2, {
      failed: false
    });
    expect(mocks.vote).toHaveBeenCalledTimes(1);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Missing port');
    }
    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: '0.1.0', port: 0 });
    expect(server.listening).toBe(true);
  } finally {
    for (const listener of process.listeners('uncaughtException')) {
      if (!originalListeners.includes(listener)) {
        process.removeListener('uncaughtException', listener);
      }
    }
    if (server) {
      await new Promise<void>(resolve => server?.close(() => resolve()));
    }
    listen.mockRestore();
    vi.unstubAllEnvs();
  }
});
