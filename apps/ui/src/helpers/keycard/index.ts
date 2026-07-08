// Mock keycard client. Persists per-address state in localStorage so the
// whole flow (create key, usage, top up) is explorable without keycard-api.
// Swap these functions for JSON-RPC calls once the API lands.
import { sleep } from '@/helpers/utils';
import { Account, ApiKey, FREE_CREDIT, PRICE_PER_REQUEST } from './types';

const STORAGE_PREFIX = 'keycard.demo';

const DAY = 86_400_000;

export function keyCost(key: ApiKey): number {
  return (
    key.usage.hub * PRICE_PER_REQUEST.hub +
    key.usage.score * PRICE_PER_REQUEST.score
  );
}

export function accountUsage(account: Account) {
  return account.keys.reduce(
    (total, key) => ({
      hub: total.hub + key.usage.hub,
      score: total.score + key.usage.score
    }),
    { hub: 0, score: 0 }
  );
}

export function accountSpend(account: Account): number {
  return account.keys.reduce((total, key) => total + keyCost(key), 0);
}

export function accountBalance(account: Account): number {
  return FREE_CREDIT + account.topups - accountSpend(account);
}

function randomHex(length: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(length / 2)))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function newKeySecret(): string {
  return `snap_${randomHex(40)}`;
}

function seedAccount(): Account {
  return {
    topups: 0,
    keys: [
      {
        id: randomHex(8),
        name: 'Production',
        key: newKeySecret(),
        created: Date.now() - 34 * DAY,
        usage: { hub: 98_410, score: 31_770 }
      },
      {
        id: randomHex(8),
        name: 'Staging',
        key: newKeySecret(),
        created: Date.now() - 12 * DAY,
        usage: { hub: 26_120, score: 13_440 }
      }
    ]
  };
}

function load(address: string): Account {
  const raw = localStorage.getItem(
    `${STORAGE_PREFIX}.${address.toLowerCase()}`
  );
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through and reseed on corrupt data
    }
  }

  const account = seedAccount();
  save(address, account);
  return account;
}

function save(address: string, account: Account) {
  localStorage.setItem(
    `${STORAGE_PREFIX}.${address.toLowerCase()}`,
    JSON.stringify(account)
  );
}

export async function fetchAccount(address: string): Promise<Account> {
  await sleep(400);
  return load(address);
}

export async function createKey(
  address: string,
  name: string
): Promise<{ account: Account; key: string }> {
  await sleep(500);

  const account = load(address);
  const key = newKeySecret();

  account.keys.push({
    id: randomHex(8),
    name,
    key,
    created: Date.now(),
    usage: { hub: 0, score: 0 }
  });
  save(address, account);

  return { account, key };
}

export async function revokeKey(address: string, id: string): Promise<Account> {
  await sleep(400);

  const account = load(address);
  account.keys = account.keys.filter(key => key.id !== id);
  save(address, account);

  return account;
}

export async function topUp(address: string, amount: number): Promise<Account> {
  await sleep(1400);

  const account = load(address);
  account.topups += amount;
  save(address, account);

  return account;
}
