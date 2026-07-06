// Mock keycard client. Persists per-address state in localStorage so the
// whole flow (create key, usage, upgrade) is explorable without keycard-api.
// Swap these functions for JSON-RPC calls once the API lands.
import { sleep } from '@/helpers/utils';
import { Account, Plan, PlanId } from './types';

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    quotaPerApp: 200_000,
    rateLimit: '60 requests / min'
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9,
    quotaPerApp: 1_000_000,
    rateLimit: 'No rate limit'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    quotaPerApp: 5_000_000,
    rateLimit: 'No rate limit',
    popular: true
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 199,
    quotaPerApp: 20_000_000,
    rateLimit: 'No rate limit'
  }
];

const STORAGE_PREFIX = 'keycard.demo';

const DAY = 86_400_000;

export function getPlan(id: PlanId): Plan {
  return PLANS.find(plan => plan.id === id) ?? PLANS[0];
}

function randomHex(length: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(length / 2)))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function seedAccount(): Account {
  return {
    plan: 'free',
    keys: [
      {
        id: randomHex(8),
        name: 'Production',
        created: Date.now() - 34 * DAY,
        usage: { hub: 98_410, score: 31_770 }
      },
      {
        id: randomHex(8),
        name: 'Staging',
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
  if (raw) return JSON.parse(raw);

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
  const secret = randomHex(40);

  account.keys.push({
    id: randomHex(8),
    name,
    created: Date.now(),
    usage: { hub: 0, score: 0 }
  });
  save(address, account);

  return { account, key: `snap_${secret}` };
}

export async function revokeKey(address: string, id: string): Promise<Account> {
  await sleep(400);

  const account = load(address);
  account.keys = account.keys.filter(key => key.id !== id);
  save(address, account);

  return account;
}

export async function upgradePlan(
  address: string,
  plan: PlanId
): Promise<Account> {
  await sleep(400);

  const account = load(address);
  account.plan = plan;
  save(address, account);

  return account;
}
