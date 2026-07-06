export type PlanId = 'free' | 'starter' | 'pro' | 'scale';

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  quotaPerApp: number;
  rateLimit: string;
  support: string;
  popular?: boolean;
};

export type ApiKey = {
  id: string;
  name: string;
  created: number;
  usage: { hub: number; score: number };
};

export type Account = {
  plan: PlanId;
  keys: ApiKey[];
};
