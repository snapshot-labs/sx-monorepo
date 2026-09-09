export type ApiKey = {
  key: string;
  name: string;
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

export type UsageHistory = {
  daily: UsageBucket[];
  monthly: UsageBucket[];
};
