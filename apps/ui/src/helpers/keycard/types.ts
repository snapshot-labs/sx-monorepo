export type ApiKeyUsage = {
  app: string;
  total: number;
};

export type ApiKey = {
  key: string;
  owner: string;
  name: string;
  tier: number;
  created: number;
  updated: number;
  active: number;
  usage: ApiKeyUsage[];
};
