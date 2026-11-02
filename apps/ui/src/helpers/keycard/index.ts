import { Wallet } from '@ethersproject/wallet';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ApiKey, Usage, UsageBucket, UsageHistory, UsageRow } from './types';

dayjs.extend(utc);

const KEYCARD_URL =
  import.meta.env.VITE_KEYCARD_URL || 'https://keycard.snapshot.org';

const DOMAIN = {
  name: 'snapshot',
  version: '0.1.4'
};

const TYPES = {
  GetKeys: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'timestamp', type: 'uint64' }
  ],
  CreateKey: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'name', type: 'string' },
    { name: 'timestamp', type: 'uint64' }
  ],
  RenameKey: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'key', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'timestamp', type: 'uint64' }
  ],
  DeleteKey: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'key', type: 'string' },
    { name: 'timestamp', type: 'uint64' }
  ]
};

const APP_FIELD: Record<string, keyof Usage> = {
  'snapshot-hub': 'hub',
  'score-api': 'score'
};

type KeysResponse = {
  keys: ApiKey[];
  usage: {
    daily: { key: string; app: string; day: string; total: number }[];
    monthly: { key: string; app: string; month: string; total: number }[];
  };
};

async function rpcCall(method: string, params: any) {
  const res = await fetch(KEYCARD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: null
    })
  });

  const { error, result } = await res.json();
  if (error) {
    throw new Error(error.data || error.message, { cause: error.code });
  }

  return result;
}

// Signs the call with the alias, which Keycard checks against the hub aliases
async function signedRpcCall(
  method: string,
  type: keyof typeof TYPES,
  alias: Wallet,
  from: string,
  params: Record<string, string> = {}
) {
  const message = {
    from,
    alias: alias.address,
    ...params,
    timestamp: Math.floor(Date.now() / 1000)
  };
  const sig = await alias._signTypedData(
    DOMAIN,
    { [type]: TYPES[type] },
    message
  );

  return rpcCall(method, { ...message, sig });
}

// The API buckets usage by the legacy period strings DD-MM-YYYY (day) and
// MM-YYYY (month), in UTC.
export function buildUsage(
  rows: { app: string; period: string; total: number }[],
  count: number,
  unit: 'day' | 'month'
): UsageBucket[] {
  const [periodFormat, labelFormat] =
    unit === 'day' ? ['DD-MM-YYYY', 'MMM D'] : ['MM-YYYY', 'MMM'];
  const totals = new Map<string, Usage>();
  for (const row of rows) {
    const field = APP_FIELD[row.app];
    if (!field) continue;

    const usage = totals.get(row.period) ?? { hub: 0, score: 0 };
    usage[field] += row.total;
    totals.set(row.period, usage);
  }

  const now = dayjs.utc().startOf(unit);
  const buckets: UsageBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = now.subtract(i, unit);
    buckets.push({
      label: date.format(labelFormat),
      ts: date.unix(),
      hub: 0,
      score: 0,
      ...totals.get(date.format(periodFormat))
    });
  }
  return buckets;
}

// Total requests of each key in the current UTC month
export function getMonthRequests(rows: UsageRow[]): Record<string, number> {
  const period = dayjs.utc().format('MM-YYYY');
  const totals: Record<string, number> = {};
  for (const row of rows) {
    if (row.period !== period || !APP_FIELD[row.app]) continue;
    totals[row.key] = (totals[row.key] ?? 0) + row.total;
  }
  return totals;
}

export async function fetchKeys(
  alias: Wallet,
  from: string
): Promise<{ keys: ApiKey[]; usage: UsageHistory }> {
  const { keys, usage }: KeysResponse = await signedRpcCall(
    'get_keys_by_owner',
    'GetKeys',
    alias,
    from
  );

  return {
    keys: keys.filter(row => row.key),
    usage: {
      daily: usage.daily.map(({ day, ...row }) => ({ ...row, period: day })),
      monthly: usage.monthly.map(({ month, ...row }) => ({
        ...row,
        period: month
      }))
    }
  };
}

export function createKey(
  alias: Wallet,
  from: string,
  params: { name: string }
): Promise<ApiKey> {
  return signedRpcCall('create_key', 'CreateKey', alias, from, params);
}

export function renameKey(
  alias: Wallet,
  from: string,
  params: { key: string; name: string }
) {
  return signedRpcCall('rename_key', 'RenameKey', alias, from, params);
}

export function deleteKey(
  alias: Wallet,
  from: string,
  params: { key: string }
) {
  return signedRpcCall('delete_key', 'DeleteKey', alias, from, params);
}
