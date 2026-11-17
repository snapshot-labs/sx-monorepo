import { Payment, Space } from '../../.checkpoint/models';
import { NETWORK } from '../config';
import {
  notifyStripeCancellation,
  notifyStripePayment,
  notifyStripeRefund
} from '../discord';
import { computeExpirationFromAmount } from '../writers';
import { stripe } from './client';
import { STRIPE_INDEXER } from './config';

const CENTS_TO_RAW = 10000n; // USD cents → 6-decimal token raw (10^6 / 10^2)

export type StripeItem = { id: string; created: number };
export type StripeWriter = (item: StripeItem) => Promise<void>;

type StripeCharge = StripeItem & {
  status: string;
  payment_intent: string | { id: string } | null;
};

type StripeRefund = StripeItem & {
  amount: number;
  status: string | null;
  payment_intent: string | { id: string } | null;
};

type StripeSubscriptionEvent = StripeItem & {
  livemode: boolean;
  data: { object: unknown; previous_attributes?: unknown };
};

type Subscription = {
  cancel_at: number | null;
  cancel_at_period_end: boolean;
  metadata: Record<string, string> | null;
  cancellation_details: {
    feedback: string | null;
    reason: string | null;
  } | null;
};

export function createStripeWriters(): Record<string, StripeWriter> {
  return {
    handleCharge,
    handleRefund,
    handleSubscriptionUpdated,
    handleSubscriptionDeleted
  };
}

async function handleCharge(item: StripeItem): Promise<void> {
  const charge = item as StripeCharge;
  const paymentIntent = charge.payment_intent;
  const paymentIntentId =
    typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id;
  if (!stripe || charge.status !== 'succeeded' || !paymentIntentId) return;

  // The space label lives only on the invoice; resolve it from the charge.
  const invoicePayments = await stripe.invoicePayments.list({
    payment: { type: 'payment_intent', payment_intent: paymentIntentId },
    limit: 1,
    expand: ['data.invoice']
  });

  const invoice = invoicePayments.data[0]?.invoice;
  if (!invoice || typeof invoice === 'string' || 'deleted' in invoice) return;

  const space = invoice.parent?.subscription_details?.metadata?.space;
  const ref = invoice.parent?.subscription_details?.metadata?.ref;
  const amountCents = invoice.amount_paid;

  if (!space || !amountCents) {
    console.error('[stripe] invoice missing space/amount_paid', invoice.id);
    return;
  }

  const paymentId = `stripe:${invoice.id}`;
  if (await Payment.loadEntity(paymentId, STRIPE_INDEXER)) return;

  console.log('[stripe] payment received for space', space);

  const amountRaw = BigInt(amountCents) * CENTS_TO_RAW;
  const timestamp = charge.created;

  const payment = new Payment(paymentId, STRIPE_INDEXER);
  payment.sender = 'stripe';
  payment.token_address = 'stripe';
  payment.token_symbol = 'USD';
  payment.amount_raw = amountRaw;
  payment.amount_decimal = (amountCents / 100).toString();
  payment.barcode = '';
  payment.block = 0;
  payment.timestamp = timestamp;
  payment.type = 'turbo';
  payment.space = space;
  if (typeof ref === 'string' && ref) payment.ref = ref;
  await payment.save();

  const existingSpace = await Space.loadEntity(space, STRIPE_INDEXER);
  const isRenewal =
    invoice.billing_reason === 'subscription_cycle' && existingSpace !== null;
  const spaceEntity = existingSpace ?? new Space(space, STRIPE_INDEXER);
  const onchainSpace = await Space.loadEntity(space, NETWORK);

  const expirationDate = computeExpirationFromAmount(
    amountRaw,
    Math.max(spaceEntity.turbo_expiration, onchainSpace?.turbo_expiration ?? 0),
    timestamp
  );
  spaceEntity.turbo_expiration = expirationDate.getTime() / 1000;
  spaceEntity.turbo_expiration_date = expirationDate.toDateString();
  await spaceEntity.save();

  notifyStripePayment(payment, spaceEntity, {
    livemode: invoice.livemode,
    isRenewal
  });
}

async function handleRefund(item: StripeItem): Promise<void> {
  const refund = item as StripeRefund;
  const paymentIntent = refund.payment_intent;
  const paymentIntentId =
    typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id;
  if (!stripe || refund.status !== 'succeeded' || !paymentIntentId) return;

  const invoicePayments = await stripe.invoicePayments.list({
    payment: { type: 'payment_intent', payment_intent: paymentIntentId },
    limit: 1
  });

  const invoicePayment = invoicePayments.data[0];
  const invoice = invoicePayment?.invoice;
  const invoiceId = typeof invoice === 'string' ? invoice : invoice?.id;
  if (!invoiceId) return;

  const payment = await Payment.loadEntity(
    `stripe:${invoiceId}`,
    STRIPE_INDEXER
  );
  if (!payment) return;

  const space = payment.space;
  const refundAmountRaw = BigInt(refund.amount) * CENTS_TO_RAW;
  const refundAmountDecimal = (refund.amount / 100).toString();
  console.log('[stripe] refund for space', space);
  if (refundAmountRaw >= payment.amount_raw) {
    await payment.delete();
  }

  const spaceEntity = await Space.loadEntity(space, STRIPE_INDEXER);
  if (spaceEntity) {
    const reductionSeconds =
      computeExpirationFromAmount(refundAmountRaw, 0, 0).getTime() / 1000;
    const expiration = spaceEntity.turbo_expiration - reductionSeconds;
    spaceEntity.turbo_expiration = expiration;
    spaceEntity.turbo_expiration_date = new Date(
      expiration * 1000
    ).toDateString();
    await spaceEntity.save();
  }

  notifyStripeRefund(
    space,
    refund.created,
    refundAmountDecimal,
    invoicePayment.livemode
  );
}

async function handleSubscriptionUpdated(item: StripeItem): Promise<void> {
  const event = item as StripeSubscriptionEvent;
  const subscription = event.data.object as Subscription;
  const prev = (event.data.previous_attributes ?? {}) as Partial<Subscription>;
  const space = subscription.metadata?.space;
  if (!space) return;

  // Portal cancellations schedule at period end, so only `updated` fires;
  // the cancel_at null → set transition filters out other subscription edits.
  if (prev.cancel_at !== null || !subscription.cancel_at) return;

  console.log('[stripe] subscription canceled for space', space);

  notifyStripeCancellation(
    space,
    event.created,
    event.livemode,
    subscription.cancellation_details?.feedback,
    subscription.cancel_at
  );
}

async function handleSubscriptionDeleted(item: StripeItem): Promise<void> {
  const event = item as StripeSubscriptionEvent;
  const subscription = event.data.object as Subscription;
  const space = subscription.metadata?.space;
  if (!space) return;

  if (subscription.cancel_at_period_end || subscription.cancel_at) return;

  console.log('[stripe] subscription deleted for space', space);

  const details = subscription.cancellation_details;
  const reason =
    details?.reason === 'cancellation_requested' ? null : details?.reason;

  notifyStripeCancellation(
    space,
    event.created,
    event.livemode,
    details?.feedback ?? reason
  );
}
