// Mock keycard client. Persists per-address state in localStorage so the
// whole flow (create key, usage, top up) is explorable without keycard-api.
// Swap these functions for JSON-RPC calls once the API lands.
import { sleep } from '@/helpers/utils';
import { Account, ApiKey, Usage } from './types';

export const STORAGE_PREFIX = 'keycard.demo';

const DAY = 86_400_000;

// Free credit granted to every account, in USD.
export const FREE_CREDIT = 50;

// Price per request in USD, per API. Kept low and per-API so heavier APIs
// cost more; can be changed later without repricing past usage.
export const PRICE_PER_REQUEST: Record<keyof Usage, number> = {
  hub: 0.0001,
  score: 0.0002
};

export function keyCost(key: ApiKey): number {
  return (
    (key.usage?.hub ?? 0) * PRICE_PER_REQUEST.hub +
    (key.usage?.score ?? 0) * PRICE_PER_REQUEST.score
  );
}

export function accountUsage(account: Account): Usage {
  return account.keys.reduce(
    (total, key) => ({
      hub: total.hub + (key.usage?.hub ?? 0),
      score: total.score + (key.usage?.score ?? 0)
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
        id: crypto.randomUUID(),
        name: 'Production',
        key: newKeySecret(),
        created: Date.now() - 34 * DAY,
        usage: { hub: 98_410, score: 31_770 }
      },
      {
        id: crypto.randomUUID(),
        name: 'Staging',
        key: newKeySecret(),
        created: Date.now() - 12 * DAY,
        usage: { hub: 26_120, score: 13_440 }
      }
    ]
  };
}

function isValidAccount(value: any): value is Account {
  return (
    !!value &&
    typeof value.topups === 'number' &&
    Array.isArray(value.keys) &&
    value.keys.every((key: any) => typeof key?.key === 'string')
  );
}

function load(address: string): Account {
  const raw = localStorage.getItem(
    `${STORAGE_PREFIX}.${address.toLowerCase()}`
  );
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // Reseed if the stored shape is stale (e.g. an older mock version) or
      // corrupt, so the demo can't render NaN / undefined values.
      if (isValidAccount(parsed)) return parsed;
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
    id: crypto.randomUUID(),
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
