import { capture } from '@snapshot-labs/snapshot-sentry';
import express, { Router } from 'express';
import { PLANS, TURBO_PRICE_CENTS } from '../config';
import { sendError } from '../utils';
import { stripe } from './client';

const router = Router();

const INDEX_TESTNET = process.env.INDEX_TESTNET;

const SPACE_NETWORK = INDEX_TESTNET ? 's-tn' : 's';
const HUB_URL = `https://${INDEX_TESTNET ? 'testnet.' : ''}hub.snapshot.org/graphql`;

async function isValidSpace(space: unknown): Promise<boolean> {
  if (typeof space !== 'string' || !space.startsWith(`${SPACE_NETWORK}:`)) {
    return false;
  }

  const id = space.slice(SPACE_NETWORK.length + 1);

  try {
    const res = await fetch(HUB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5_000),
      body: JSON.stringify({
        query: 'query Space($id: String!) { space(id: $id) { id } }',
        variables: { id }
      })
    });
    if (!res.ok) return false;

    const { data } = (await res.json()) as {
      data?: { space?: { id: string } | null };
    };
    return data?.space?.id === id;
  } catch (err) {
    capture(err);
    console.error('[stripe] space validation failed:', err);
    return false;
  }
}

const SUBSCRIBED_STATUSES = ['active', 'past_due'];

async function findActiveSubscription(
  client: NonNullable<typeof stripe>,
  space: string
) {
  const { data } = await client.subscriptions.search({
    query: `metadata['space']:'${space}'`,
    limit: 10
  });
  return data.find(s => SUBSCRIBED_STATUSES.includes(s.status));
}

router.post('/create', express.json(), async (req, res) => {
  if (!stripe) return sendError(res, 'stripe not configured');

  const { space, plan, ref, success_url, cancel_url } = req.body ?? {};

  if (!(await isValidSpace(space))) {
    return sendError(res, 'missing or invalid space', 400);
  }

  if (!PLANS.includes(plan)) {
    return sendError(res, 'invalid plan', 400);
  }

  try {
    if (await findActiveSubscription(stripe, space)) {
      return sendError(res, 'space already has an active subscription', 409);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Snapshot Pro (${space})` },
            unit_amount: TURBO_PRICE_CENTS[plan],
            recurring: { interval: plan === 'yearly' ? 'year' : 'month' }
          },
          quantity: 1
        }
      ],
      subscription_data: {
        metadata: {
          space,
          ...(typeof ref === 'string' && ref && ref.length <= 100
            ? { ref }
            : {})
        }
      },
      success_url,
      cancel_url
    });
    return res.json({ result: { url: session.url } });
  } catch (err) {
    capture(err);
    console.error('[stripe] /create failed:', err);
    return sendError(res, err instanceof Error ? err.message : 'failed');
  }
});

router.get('/portal', async (_req, res) => {
  if (!stripe) return sendError(res, 'stripe not configured');

  try {
    const configs = await stripe.billingPortal.configurations.list({
      is_default: true,
      active: true,
      limit: 1
    });
    const url = configs.data[0]?.login_page?.url;
    if (!url) return sendError(res, 'portal not configured');
    return res.json({ result: { url } });
  } catch (err) {
    capture(err);
    console.error('[stripe] /portal failed:', err);
    return sendError(res, err instanceof Error ? err.message : 'failed');
  }
});

router.get('/subscription', async (req, res) => {
  if (!stripe) return res.json({ result: { stripeAvailable: false } });

  const { space } = req.query;
  if (!(await isValidSpace(space))) {
    return sendError(res, 'missing or invalid space', 400);
  }

  try {
    const subscription = await findActiveSubscription(stripe, space);
    return res.json({
      result: {
        stripeAvailable: true,
        activeSubscription: !!subscription,
        pastDue: subscription?.status === 'past_due',
        cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
        renewsAt: subscription?.items.data[0]?.current_period_end ?? null
      }
    });
  } catch (err) {
    capture(err);
    console.error('[stripe] /subscription failed:', err);
    return sendError(res, err instanceof Error ? err.message : 'failed');
  }
});

export default router;
