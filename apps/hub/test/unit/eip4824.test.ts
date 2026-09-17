import { execFileSync } from 'child_process';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { resolve } from 'path';
import express from 'express';
import router from '../../src/eip4824';
import { getSpace } from '../../src/helpers/spaces';

jest.mock('../../src/helpers/mysql', () => ({}));
jest.mock('../../src/helpers/spaces', () => ({ getSpace: jest.fn() }));

describe('EIP-4824 optional space fields', () => {
  let server: Server;
  let url: string;

  it('serves optional and malformed fields with real Sentry v4 enabled', () => {
    const output = execFileSync(
      process.execPath,
      [
        '-r',
        'ts-node/register/transpile-only',
        '-e',
        `
      const assert = require('node:assert/strict');
      const { initLogger, fallbackLogger } = require('@snapshot-labs/snapshot-sentry');
      // Suppress delivery of synthetic errors, keeping strict rejection handling.
      initLogger({ ignoreErrors: [/./] });
      let space = { verified: true, name: 'test' };
      require.cache[require.resolve('./src/helpers/mysql')] = { exports: {} };
      require.cache[require.resolve('./src/helpers/spaces')] = {
        exports: { getSpace: async () => space }
      };
      const app = require('express')();
      app.use(require('./src/eip4824').default);
      fallbackLogger(app);
      const server = app.listen(0, '127.0.0.1', async () => {
        try {
          const url = 'http://127.0.0.1:' + server.address().port + '/test.eth/';
          for (const field of ['members', 'contracts']) {
            const response = await fetch(url + field);
            assert.equal(response.status, 200);
            assert.deepEqual((await response.json())[field], []);
          }
          space = { verified: true, admins: {}, treasuries: {} };
          for (const field of ['members', 'contracts']) {
            const response = await fetch(url + field);
            assert.equal(response.status, 500);
            assert.equal(await response.text(), 'Internal Server Error');
          }
          server.close(() => { console.log('survived'); process.exit(0); });
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
      });
    `
      ],
      {
        cwd: resolve(__dirname, '../..'),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          SENTRY_DSN: 'https://public@example.invalid/1'
        },
        encoding: 'utf8',
        timeout: 10000
      }
    );
    expect(output).toContain('survived');
  });

  beforeAll(async () => {
    const app = express();
    app.use(router);
    app.use((err: Error, _req, res, next) => {
      if (res.headersSent) return next(err);
      res.status(500).json({ error: err.message });
    });
    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
  });

  it.each(['members', 'contracts'])(
    'defaults missing %s to an empty list',
    async field => {
      jest.mocked(getSpace).mockResolvedValue({ verified: true, name: 'test' });
      const response = await fetch(`${url}/test.eth/${field}`);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ [field]: [] });
    }
  );

  it('keeps configured members', async () => {
    jest.mocked(getSpace).mockResolvedValue({
      verified: true,
      admins: ['admin'],
      moderators: ['moderator'],
      members: ['member']
    });
    const response = await fetch(`${url}/test.eth/members`);
    expect(await response.json()).toMatchObject({
      members: ['admin', 'moderator', 'member'].map(id => ({
        type: 'EthereumAddress',
        id
      }))
    });
  });

  it('keeps configured treasuries', async () => {
    jest.mocked(getSpace).mockResolvedValue({
      verified: true,
      treasuries: [{ address: 'treasury', name: 'Treasury' }]
    });
    const response = await fetch(`${url}/test.eth/contracts`);
    expect(await response.json()).toMatchObject({
      contracts: [{ type: 'EthereumAddress', id: 'treasury', name: 'Treasury' }]
    });
  });

  it.each(['members', 'contracts'])(
    'forwards malformed %s to Express error handling',
    async field => {
      jest
        .mocked(getSpace)
        .mockResolvedValue({ verified: true, admins: {}, treasuries: {} });
      const response = await fetch(`${url}/test.eth/${field}`);
      expect(response.status).toBe(500);
    }
  );

  it.each(['members', 'contracts'])(
    'preserves the %s not-found response',
    async field => {
      jest.mocked(getSpace).mockRejectedValue(new Error('NOT_FOUND'));
      const response = await fetch(`${url}/test.eth/${field}`);
      expect(response.status).toBe(404);
    }
  );

  it.each(['members', 'contracts'])(
    'rejects unverified spaces for %s',
    async field => {
      jest.mocked(getSpace).mockResolvedValue({ verified: false });
      const response = await fetch(`${url}/test.eth/${field}`);
      expect(response.status).toBe(400);
    }
  );
});
