export type ApiKey = {
  key: string;
  name: string;
  owner: string;
  created: number;
};

export type Usage = {
  hub: number;
  score: number;
};

export type UsageBucket = Usage & {
  label: string;
  ts: number;
};

export type UsageRow = {
  key: string;
  app: string;
  period: string;
  total: number;
};

export type UsageHistory = {
  daily: UsageRow[];
  monthly: UsageRow[];
};
