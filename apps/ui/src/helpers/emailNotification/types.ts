export type EmailSubscriptionParams = {
  email: string;
  subscriptions?: string[];
};

export type EmailSubscriptionMethod = 'subscribe' | 'update';

export type EmailSubscriptionStatus =
  | 'NOT_SUBSCRIBED'
  | 'UNVERIFIED'
  | 'VERIFIED';

export type EmailSubscription = {
  status: EmailSubscriptionStatus;
  feeds: string[];
};
