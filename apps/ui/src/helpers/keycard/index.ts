import { Wallet } from '@ethersproject/wallet';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ApiKey, Usage, UsageBucket, UsageHistory } from './types';

dayjs.extend(utc);

const KEYCARD_URL = 'https://keycard.snapshot.org';

const DOMAIN = {
  name: 'snapshot',
  version: '0.1.4'
};

const GetKeysSchema = {
  GetKeys: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'timestamp', type: 'uint64' }
  ]
};

const APP_FIELD: Record<string, keyof Usage> = {
  'snapshot-hub': 'hub',
  'score-api': 'score'
};

// Price per request in USD, per API.
export const PRICE_PER_REQUEST: Record<keyof Usage, number> = {
  hub: 0.0001,
  score: 0.0002
};

type UsageRows = { app: string; period: string; total: number }[];

type KeysResponse = {
  keys: ApiKey[];
  usage: {
    daily: { app: string; day: string; total: number }[];
    monthly: { app: string; month: string; total: number }[];
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
  if (error)
    throw new Error(error.data || error.message, { cause: error.code });

  return result;
}

// The API buckets usage by the legacy period strings DD-MM-YYYY (day) and
// MM-YYYY (month), in UTC.
function buildUsage(
  rows: UsageRows,
  count: number,
  unit: 'day' | 'month',
  periodFormat: string,
  labelFormat: string
): UsageBucket[] {
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

export async function fetchKeys(
  alias: Wallet,
  from: string
): Promise<{ keys: ApiKey[]; usage: UsageHistory }> {
  const message = {
    from,
    alias: alias.address,
    timestamp: Math.floor(Date.now() / 1000)
  };
  const sig = await alias._signTypedData(DOMAIN, GetKeysSchema, message);

  const { keys, usage }: KeysResponse = await rpcCall('get_keys_by_owner', {
    ...message,
    sig
  });

  return {
    keys: keys.filter(row => row.key),
    usage: {
      daily: buildUsage(
        usage.daily.map(row => ({ ...row, period: row.day })),
        30,
        'day',
        'DD-MM-YYYY',
        'MMM D'
      ),
      monthly: buildUsage(
        usage.monthly.map(row => ({ ...row, period: row.month })),
        12,
        'month',
        'MM-YYYY',
        'MMM'
      )
    }
  };
}
