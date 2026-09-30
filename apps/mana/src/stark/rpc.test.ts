import { once } from 'node:events';
import { Server } from 'node:http';
import express from 'express';
import { constants } from 'starknet';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import router from './index';
import logger from './logger';
import * as db from '../db';

vi.mock('./networks', () => ({
  NETWORKS: new Map([['test-network', {}]]),
  NETWORK_IDS: new Map([['test-network', 'test-network']]),
  getClient: vi.fn(() => ({ client: {}, getAccount: vi.fn() }))
}));
vi.mock('./dependencies', () => ({ generateSpaceStarknetWallet: vi.fn() }));
vi.mock('./herodotus', () => ({ registerProposal: vi.fn() }));
vi.mock('../db', () => ({ registerTransaction: vi.fn() }));
vi.mock('./logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

const valid = {
  type: 'Vote',
  sender: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  hash: '0x15c3ec5ebb1e82803db2d695eb12a902d5bb0d52c63e1536015e6d3debe70',
  payload: {
    space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
    authenticator: '0x123',
    strategies: [{ index: 0, address: '0x456', params: '0x' }],
    proposal: 32,
    choice: 1,
    metadataUri: 'ipfs://metadata',
    executionStrategy: { addr: '0x789', params: ['0x101'] }
  }
};

const invalid = [
  [
    'observed registration',
    { ...valid, type: 'e001-test', sender: 'e001-test', hash: '0xe001' }
  ],
  ['unsupported type', { ...valid, type: 'Execute' }],
  ['missing type', { ...valid, type: undefined }],
  ['numeric type', { ...valid, type: 1 }],
  ['malformed sender', { ...valid, sender: 'e001-test' }],
  ['numeric sender', { ...valid, sender: 1 }],
  ['null sender', { ...valid, sender: null }],
  ['array sender', { ...valid, sender: ['0x1'] }],
  ['negative sender', { ...valid, sender: '-1' }],
  [
    'sender field bound',
    { ...valid, sender: `0x${constants.PRIME.toString(16)}` }
  ],
  ['malformed hash', { ...valid, hash: '0xnope' }],
  ['empty hash', { ...valid, hash: '0x' }],
  ['numeric hash', { ...valid, hash: 1 }],
  ['null hash', { ...valid, hash: null }],
  ['array hash', { ...valid, hash: ['0x1'] }],
  ['hash field bound', { ...valid, hash: `0x${constants.PRIME.toString(16)}` }],
  ['oversized hash', { ...valid, hash: `0x${'0'.repeat(65)}` }],
  ['missing payload', { ...valid, payload: undefined }],
  ['null payload', { ...valid, payload: null }],
  ['array payload', { ...valid, payload: [] }],
  ['string payload', { ...valid, payload: 'private-payload' }],
  ['missing space', { ...valid, payload: { authenticator: '0x1' } }],
  ['missing authenticator', { ...valid, payload: { space: '0x1' } }],
  [
    'invalid space',
    { ...valid, payload: { ...valid.payload, space: 'not-hex' } }
  ],
  [
    'space address bound',
    {
      ...valid,
      payload: { ...valid.payload, space: `0x${(2n ** 251n).toString(16)}` }
    }
  ],
  [
    'invalid authenticator',
    { ...valid, payload: { ...valid.payload, authenticator: 'not-hex' } }
  ],
  [
    'authenticator address bound',
    {
      ...valid,
      payload: {
        ...valid.payload,
        authenticator: `0x${(2n ** 251n).toString(16)}`
      }
    }
  ],
  ['null params', null],
  ['array params', []]
] as const;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/stark_rpc', router);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });
});

beforeEach(() => vi.clearAllMocks());

function register(params: unknown, network = 'test-network') {
  return fetch(`${baseUrl}/stark_rpc/${network}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 7,
      method: 'registerTransaction',
      params
    })
  });
}

describe('registerTransaction HTTP boundary', () => {
  it.each(invalid)(
    'rejects %s without persisting or logging its payload',
    async (_, params) => {
      const response = await register(params);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        jsonrpc: '2.0',
        id: 7,
        error: {
          code: 400,
          message: 'unauthorized',
          data: 'Invalid transaction parameters'
        }
      });
      expect(db.registerTransaction).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
    }
  );

  it.each(['Propose', 'UpdateProposal', 'Vote'])(
    'accepts %s without changing its payload',
    async type => {
      const response = await register({ ...valid, type });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        jsonrpc: '2.0',
        result: true,
        id: 7
      });
      expect(db.registerTransaction).toHaveBeenCalledWith(
        'test-network',
        type,
        valid.sender,
        valid.hash,
        valid.payload
      );
      expect(logger.info).toHaveBeenLastCalledWith(
        { type, sender: valid.sender, hash: valid.hash },
        'Registering transaction'
      );
    }
  );

  it('accepts the largest felt and historical unprefixed commit inputs', async () => {
    const params = {
      ...valid,
      sender: (constants.PRIME - 1n).toString(16),
      hash: 'e001'
    };
    expect((await register(params)).status).toBe(200);
    expect(db.registerTransaction).toHaveBeenCalledWith(
      'test-network',
      params.type,
      params.sender,
      params.hash,
      params.payload
    );
  });

  it('keeps unsupported networks out of the queue', async () => {
    expect((await register(valid, 'unsupported')).status).toBe(404);
    expect(db.registerTransaction).not.toHaveBeenCalled();
  });

  it('reports database failure without accepting the registration', async () => {
    vi.mocked(db.registerTransaction).mockRejectedValueOnce(
      new Error('database unavailable: private-payload')
    );
    const response = await register(valid);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      jsonrpc: '2.0',
      id: 7,
      error: {
        code: 500,
        message: 'unauthorized',
        data: 'Failed to register transaction'
      }
    });
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      'Failed to register transaction'
    );
    expect((await register(valid)).status).toBe(200);
  });
});
