import { Wallet } from '@ethersproject/wallet';
import { beforeEach, describe, expect, test } from 'bun:test';
import { DOMAIN, GET_CONTEXT_TYPES, verifySigner } from './auth';

const OWNER = '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70';

let owner: string | undefined = OWNER;

const findOwner = async () => owner;

const alias = Wallet.createRandom();

const now = () => Math.floor(Date.now() / 1000);

async function request(overrides: Record<string, unknown> = {}) {
  const message = {
    from: OWNER,
    alias: alias.address,
    timestamp: now(),
    ...overrides
  };

  return {
    ...message,
    sig: await alias._signTypedData(DOMAIN, GET_CONTEXT_TYPES, message)
  };
}

describe('verifySigner', () => {
  beforeEach(() => {
    owner = OWNER;
  });

  test('accepts a live alias signing for the address it belongs to', async () => {
    expect(
      verifySigner(GET_CONTEXT_TYPES, await request(), findOwner)
    ).resolves.toBeUndefined();
  });

  test('refuses an alias the hub does not tie to that address', async () => {
    owner = '0x0000000000000000000000000000000000000001';

    expect(
      verifySigner(GET_CONTEXT_TYPES, await request(), findOwner)
    ).rejects.toThrow('alias does not belong to that address');
  });

  test('refuses an expired or unknown alias, which the hub reports as nobody', async () => {
    owner = undefined;

    expect(
      verifySigner(GET_CONTEXT_TYPES, await request(), findOwner)
    ).rejects.toThrow('alias does not belong to that address');
  });

  test('refuses a signature made by another key', async () => {
    const body = await request();
    body.alias = Wallet.createRandom().address;

    expect(verifySigner(GET_CONTEXT_TYPES, body, findOwner)).rejects.toThrow(
      'signature does not match the alias'
    );
  });

  test('refuses a message signed too long ago to replay', async () => {
    expect(
      verifySigner(
        GET_CONTEXT_TYPES,
        await request({ timestamp: now() - 3600 }),
        findOwner
      )
    ).rejects.toThrow('timestamp is too far off');
  });
});
