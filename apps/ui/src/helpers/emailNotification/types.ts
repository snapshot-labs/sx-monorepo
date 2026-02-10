export type EmailSubscriptionStatus =
  | 'NOT_SUBSCRIBED'
  | 'UNVERIFIED'
  | 'VERIFIED';

export type EmailSubscription = {
  status: EmailSubscriptionStatus;
  feeds: string[];
};
