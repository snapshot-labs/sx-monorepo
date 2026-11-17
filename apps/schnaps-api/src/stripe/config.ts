import { CheckpointConfig } from '@snapshot-labs/checkpoint';

// Stripe rows live under their own indexer, so the EVM indexer's block
// rollbacks and reorgs can never discard them
export const STRIPE_INDEXER = 'stripe';
export const WINDOW = 60; // a "block" is a 1-minute time window
const STRIPE_START_TS = 1767225600; // 2026-01-01, before the first payment

export const STRIPE_EVENTS = {
  CHARGE: 'charge',
  REFUND: 'refund',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted'
} as const;

export const stripeConfig: CheckpointConfig = {
  network_node_url: 'https://api.stripe.com', // required by schema; never called
  optimistic_indexing: false,
  fetch_interval: 15_000,
  sources: [
    {
      contract: 'stripe',
      start: ~~(STRIPE_START_TS / WINDOW),
      events: [
        { name: STRIPE_EVENTS.CHARGE, fn: 'handleCharge' },
        { name: STRIPE_EVENTS.REFUND, fn: 'handleRefund' },
        {
          name: STRIPE_EVENTS.SUBSCRIPTION_UPDATED,
          fn: 'handleSubscriptionUpdated'
        },
        {
          name: STRIPE_EVENTS.SUBSCRIPTION_DELETED,
          fn: 'handleSubscriptionDeleted'
        }
      ]
    }
  ]
};
