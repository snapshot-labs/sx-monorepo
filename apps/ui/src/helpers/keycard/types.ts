export type ApiKey = {
  id: string;
  name: string;
  key: string;
  created: number;
  usage: { hub: number; score: number };
};

export type Account = {
  topups: number;
  keys: ApiKey[];
};

// Free credit granted to every account, in USD.
export const FREE_CREDIT = 50;

// Price per request in USD, per API. Kept low and per-API so heavier APIs
// cost more; can be changed later without repricing past usage.
export const PRICE_PER_REQUEST = {
  hub: 0.0001,
  score: 0.0002
};
