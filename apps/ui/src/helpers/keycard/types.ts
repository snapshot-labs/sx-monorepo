export type Usage = {
  hub: number;
  score: number;
};

export type ApiKey = {
  id: string;
  name: string;
  key: string;
  created: number;
  updated?: number;
  usage: Usage;
};

export type TopUp = {
  id: string;
  amount: number;
  created: number;
};

export type Account = {
  topups: TopUp[];
  keys: ApiKey[];
  // Credit consumed by keys that have since been revoked (never refunded).
  spent?: number;
  // Server-authoritative remaining USD credit, filled in by the seam
  // (get_account at go-live). Read this instead of recomputing client-side.
  balance?: number;
};

export type UsageBucket = Usage & {
  label: string;
  ts: number;
};

export type UsageHistory = {
  daily: UsageBucket[];
  monthly: UsageBucket[];
};
