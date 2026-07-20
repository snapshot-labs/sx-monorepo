// Mock keycard client. Persists per-address state in localStorage so the
// whole flow (create key, usage, top up) is explorable without keycard-api.
import { sleep } from '@/helpers/utils';
import { Payment } from '@/queries/payments';
import { Account, ApiKey, Usage, UsageBucket, UsageHistory } from './types';

export const STORAGE_PREFIX = 'keycard.demo';

const DAY = 86_400_000;

// keycard-api stores timestamps as unix SECONDS; mirror that so a real client
// can pass API values straight through without unit conversion.
const nowSeconds = () => Math.floor(Date.now() / 1000);
const secondsAgo = (days: number) => nowSeconds() - days * 86_400;

const FREE_CREDIT = 50;

export const MAX_KEYS = 10;

// Price per request in USD, per API.
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

function hasUsage(account: Account): boolean {
  return account.keys.some(
    key => (key.usage?.hub ?? 0) + (key.usage?.score ?? 0) > 0
  );
}

function accountSpend(account: Account): number {
  return account.keys.reduce((total, key) => total + keyCost(key), 0);
}

// Remaining USD credit. Mock-only: the real get_account returns this directly.
function accountBalance(account: Account): number {
  const credited = account.topups.reduce((sum, topup) => sum + topup.amount, 0);
  return FREE_CREDIT + credited - accountSpend(account) - (account.spent ?? 0);
}

// What each seam function returns: the stored account plus the
// server-authoritative balance the real get_account will supply. The UI reads
// account.balance and never recomputes it.
function present(account: Account): Account {
  return { ...account, balance: accountBalance(account) };
}

// Deterministic pseudo-random so the demo chart doesn't reshuffle each render.
function seededUnit(seed: number): number {
  const value = Math.sin(seed) * 10_000;
  return value - Math.floor(value);
}

function buildDailyUsage(account: Account, days = 30): UsageBucket[] {
  const active = hasUsage(account);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: UsageBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const seed = Math.floor(date.getTime() / DAY);
    buckets.push({
      label: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      ts: Math.floor(date.getTime() / 1000),
      hub: active ? Math.round(300 + seededUnit(seed) * 1500) : 0,
      score: active ? Math.round(80 + seededUnit(seed + 7) * 500) : 0
    });
  }
  return buckets;
}

function buildMonthlyUsage(account: Account, months = 12): UsageBucket[] {
  const active = hasUsage(account);

  const now = new Date();
  const buckets: UsageBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const seed = date.getFullYear() * 12 + date.getMonth();
    buckets.push({
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      ts: Math.floor(date.getTime() / 1000),
      hub: active ? Math.round(9_000 + seededUnit(seed) * 40_000) : 0,
      score: active ? Math.round(3_000 + seededUnit(seed + 7) * 15_000) : 0
    });
  }
  return buckets;
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
    topups: [
      { id: `0x${randomHex(64)}`, amount: 50, created: secondsAgo(40) },
      { id: `0x${randomHex(64)}`, amount: 25, created: secondsAgo(9) }
    ],
    keys: [
      {
        id: crypto.randomUUID(),
        name: 'Production',
        key: newKeySecret(),
        created: secondsAgo(34),
        updated: secondsAgo(2),
        usage: { hub: 98_410, score: 31_770 }
      },
      {
        id: crypto.randomUUID(),
        name: 'Staging',
        key: newKeySecret(),
        created: secondsAgo(12),
        updated: secondsAgo(1),
        usage: { hub: 26_120, score: 13_440 }
      }
    ]
  };
}

function isValidAccount(value: any): value is Account {
  return (
    !!value &&
    Array.isArray(value.topups) &&
    value.topups.every(
      (topup: any) =>
        typeof topup?.amount === 'number' && typeof topup?.created === 'number'
    ) &&
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

// --- keycard-api calls (mock) ---
// Each stands in for a keycard-api JSON-RPC method; swap the bodies for
// network calls to go live. Timestamps are unix seconds (API-native), so a
// real body can pass them straight through.

export async function fetchAccount(address: string): Promise<Account> {
  await sleep(400);
  return present(load(address));
}

// Maps to the reqs_daily / reqs_monthly aggregation on keycard-api.
export async function fetchUsage(address: string): Promise<UsageHistory> {
  await sleep(400);
  const account = load(address);
  return {
    daily: buildDailyUsage(account),
    monthly: buildMonthlyUsage(account)
  };
}

// Maps to credit top-up records (schnaps/Stripe payments) on keycard-api,
// plus the one-time free credit shown as the oldest entry.
export async function fetchPayments(address: string): Promise<Payment[]> {
  await sleep(400);
  const account = load(address);

  const topupPayments: Payment[] = account.topups.map(topup => ({
    id: topup.id,
    space: '',
    amount_decimal: String(topup.amount),
    token_symbol: 'USDC',
    timestamp: topup.created,
    type: 'topup'
  }));

  const freeCredit: Payment = {
    id: 'free-credit',
    space: '',
    amount_decimal: String(FREE_CREDIT),
    token_symbol: 'USD',
    type: 'free'
  };

  return [...topupPayments, freeCredit].sort(
    (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
  );
}

export async function createKey(
  address: string,
  name: string
): Promise<{ account: Account; key: string }> {
  await sleep(500);

  const account = load(address);
  if (account.keys.length >= MAX_KEYS) {
    throw new Error(`You can create up to ${MAX_KEYS} API keys.`);
  }
  if (
    account.keys.some(
      existing =>
        existing.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
  ) {
    throw new Error('A key with this name already exists.');
  }

  const key = newKeySecret();

  account.keys.push({
    id: crypto.randomUUID(),
    name,
    key,
    created: nowSeconds(),
    updated: nowSeconds(),
    usage: { hub: 0, score: 0 }
  });
  save(address, account);

  return { account: present(account), key };
}

export async function revokeKey(address: string, id: string): Promise<Account> {
  await sleep(400);

  const account = load(address);
  const revoked = account.keys.find(key => key.id === id);
  if (revoked) {
    account.spent = (account.spent ?? 0) + keyCost(revoked);
  }
  account.keys = account.keys.filter(key => key.id !== id);
  save(address, account);

  return present(account);
}

export async function topUp(address: string, amount: number): Promise<Account> {
  await sleep(1400);

  const account = load(address);
  account.topups.push({
    id: `0x${randomHex(64)}`,
    amount,
    created: nowSeconds()
  });
  save(address, account);

  return present(account);
}
