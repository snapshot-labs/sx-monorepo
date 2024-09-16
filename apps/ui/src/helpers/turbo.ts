export const MAX_BODY_LENGTH = {
  default: 10000,
  turbo: 40000
} as const;

export const MAX_CHOICES = {
  default: 500,
  turbo: 1000
};

export const MAX_1D_PROPOSALS = {
  default: 20,
  turbo: 40
};

export const MAX_7D_PROPOSALS = {
  default: 100,
  turbo: 200
};

export const TURBO_URL =
  'https://docs.snapshot.org/user-guides/spaces/turbo-plan';
