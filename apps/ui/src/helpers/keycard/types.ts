export type Usage = {
  hub: number;
  score: number;
};

export type ApiKey = {
  id: string;
  name: string;
  key: string;
  created: number;
  usage: Usage;
};

export type Account = {
  topups: number;
  keys: ApiKey[];
};

export type UsageBucket = Usage & {
  label: string;
  ts: number;
};

export type UsageHistory = {
  daily: UsageBucket[];
  monthly: UsageBucket[];
};
