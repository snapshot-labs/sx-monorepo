import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { expect, it } from 'vitest';
import Aliases from './aliases';
import { MemoryAdapter } from '../highlight/adapter/memory';
import Process from '../highlight/process';
import { BASE_DOMAIN } from '../highlight/signatures';

const CHAIN_ID = '11155111';

const provider = new StaticJsonRpcProvider('https://rpc.snapshot.org/11155111');
const adapter = new MemoryAdapter();
const wallet = getWallet();

function getWallet() {
  const wallet = Wallet.createRandom({
    provider: provider
  });

  return new Wallet(wallet.privateKey, provider);
}

function getSalt() {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);

  return `0x${buffer.reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')}`;
}

it('should create alias', async () => {
  const process = new Process({ adapter });
  const aliases = new Aliases('aliases', process);

  const from = await wallet.getAddress();

  const domain = {
    ...BASE_DOMAIN,
    chainId: CHAIN_ID,
    verifyingContract: '0x0000000000000000000000000000000000000001',
    salt: getSalt()
  };

  const message = {
    from,
    alias: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
  };

  await expect(
    aliases.setAlias(message, { domain, signer: from })
  ).resolves.toBeUndefined();

  expect(process.events).toEqual([
    {
      agent: 'aliases',
      data: [from, '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', domain.salt],
      key: 'setAlias'
    }
  ]);
});

it('should throw if tries to creates alias for non-signer', async () => {
  const process = new Process({ adapter });
  const aliases = new Aliases('aliases', process);

  const from = await wallet.getAddress();

  const domain = {
    ...BASE_DOMAIN,
    chainId: CHAIN_ID,
    verifyingContract: '0x0000000000000000000000000000000000000001',
    salt: getSalt()
  };

  const message = {
    from: '0x9905a3A1bAE3b10AD163Bb3735aE87cd70b84eC4',
    alias: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
  };

  await expect(
    aliases.setAlias(message, { domain, signer: from })
  ).rejects.toThrow('Invalid signer');
});

it('should throw if alias is reused', async () => {
  const process = new Process({ adapter });
  const aliases = new Aliases('aliases', process);

  const from = await wallet.getAddress();

  const domain = {
    ...BASE_DOMAIN,
    chainId: CHAIN_ID,
    verifyingContract: '0x0000000000000000000000000000000000000001',
    salt: getSalt()
  };

  const message = {
    from,
    alias: '0x9905a3A1bAE3b10AD163Bb3735aE87cd70b84eC4'
  };

  await expect(
    aliases.setAlias(message, { domain, signer: from })
  ).resolves.toBeUndefined();

  expect(process.events).toHaveLength(1);

  domain.salt = getSalt();

  await expect(
    aliases.setAlias(message, { domain, signer: from })
  ).rejects.toThrow('Alias already exists');

  expect(process.events).toHaveLength(1);
});
