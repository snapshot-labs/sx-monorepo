import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AGENTS_MAP } from '../../src/agents';
import { SET_ALIAS_TYPES } from '../../src/agents/aliases';
import { MemoryAdapter } from '../../src/highlight/adapter/memory';
import Highlight from '../../src/highlight/highlight';
import { BASE_DOMAIN } from '../../src/highlight/signatures';
import { PostMessageRequest } from '../../src/highlight/types';

const CHAIN_ID = '11155111';
const PRIVATE_KEY =
  '0x6e8d65443b59362a32762cf8409b5ba307f64ee9db4a3d0cff00fbdf49d0d2d6';
const ALIASES_ADDRESS = '0x0000000000000000000000000000000000000001';
const FAKE_SIGNATURE =
  '0x9a40ce5d706efe66cdc1b9075b866ba25385bf083bbc19b7e1ce315ac2a3957f3a6e075762f6f4723006889ed341ce740e023959f6c600e30586f005f5afa64a1c';

const provider = new StaticJsonRpcProvider('https://rpc.snapshot.org/11155111');
const adapter = new MemoryAdapter();
const highlight = new Highlight({ adapter, agents: AGENTS_MAP });
const wallet = new Wallet(PRIVATE_KEY, provider);

function formatSalt(salt: bigint): string {
  return `0x${salt.toString(16).padStart(64, '0')}`;
}

async function createRequest(
  chainId: string,
  salt: string,
  message: {
    from: string;
    alias: string;
  },
  opts: { useFakeSignature?: boolean } = {}
): Promise<PostMessageRequest> {
  const signer = await wallet.getAddress();

  const domain = {
    ...BASE_DOMAIN,
    chainId,
    salt,
    verifyingContract: ALIASES_ADDRESS
  };

  const signature = opts.useFakeSignature
    ? FAKE_SIGNATURE
    : await wallet._signTypedData(domain, SET_ALIAS_TYPES, message);

  return {
    domain,
    message,
    primaryType: 'SetAlias',
    signer,
    signature
  };
}

describe('setAlias', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should emit event', async () => {
    const salt = formatSalt(0n);
    const message = {
      from: await wallet.getAddress(),
      alias: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
    };

    const request = await createRequest(CHAIN_ID, salt, message);

    const res = await highlight.postMessage(request);

    expect(res).toEqual({
      joint: {
        unit: {
          id: 0,
          version: '0x1',
          timestamp: 1735689600,
          message: request
        }
      },
      events: [
        {
          agent: 'aliases',
          data: [message.from, message.alias, salt],
          key: 'setAlias'
        }
      ],
      steps: 3,
      unit_id: 1
    });
  });

  it('should throw when salt is reused', async () => {
    const salt = formatSalt(0n);
    const message = {
      from: await wallet.getAddress(),
      alias: '0x537f1896541d28F4c70116EEa602b1B34Da95163'
    };

    const request = await createRequest(CHAIN_ID, salt, message);

    await expect(highlight.postMessage(request)).rejects.toThrow(
      'Salt already used'
    );
  });

  it('should throw when alias is reused', async () => {
    const salt = formatSalt(1n);
    const message = {
      from: await wallet.getAddress(),
      alias: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
    };

    const request = await createRequest(CHAIN_ID, salt, message);

    await expect(highlight.postMessage(request)).rejects.toThrow(
      'Alias already exists'
    );
  });

  it('should throw when signature is invalid', async () => {
    const salt = formatSalt(1n);
    const message = {
      from: await wallet.getAddress(),
      alias: '0x537f1896541d28F4c70116EEa602b1B34Da95163'
    };

    const request = await createRequest(CHAIN_ID, salt, message, {
      useFakeSignature: true
    });

    await expect(highlight.postMessage(request)).rejects.toThrow(
      'Invalid signature'
    );
  });
});

it('should retrieve unit receipt', async () => {
  const receipt = await highlight.getUnitReceipt({
    id: 1
  });

  expect(receipt).toEqual({
    events: [
      {
        agent: 'aliases',
        data: [
          '0x15Bb65c57Fc440f3aC4FBeEC68137b084416474b',
          '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        ],
        key: 'setAlias'
      }
    ],
    unit: {
      id: 0,
      message: {
        domain: {
          chainId: '11155111',
          name: 'highlight',
          salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
          verifyingContract: '0x0000000000000000000000000000000000000001',
          version: '0.1.0'
        },
        message: {
          alias: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
          from: '0x15Bb65c57Fc440f3aC4FBeEC68137b084416474b'
        },
        primaryType: 'SetAlias',
        signature:
          '0xd4f5345c22473b6f0040145d0ceb311ce4bc107872160b6d7287ccebcda4005d0e5186d2557ba698da5518ddc66d4ff89e202498b6e75300fd2cfdc3064373241b',
        signer: '0x15Bb65c57Fc440f3aC4FBeEC68137b084416474b'
      },
      timestamp: 1735689600,
      version: '0x1'
    }
  });
});

it('should retrieve MCI', async () => {
  const mci = await highlight.getMci();

  expect(mci).toEqual(1);
});
