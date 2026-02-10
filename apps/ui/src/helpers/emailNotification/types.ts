export type Params = { email: string; subscriptions?: string[] };

export type Method = 'subscribe' | 'update';

export type EmailSubscriptionStatus =
  | 'NOT_SUBSCRIBED'
  | 'UNVERIFIED'
  | 'VERIFIED';

export type EmailSubscription = {
  status: EmailSubscriptionStatus;
  feeds: string[];
};
