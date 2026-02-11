import { EmailSubscription } from './types';

const ENVELOP_API_URL = import.meta.env.VITE_ENVELOP_URL;

export async function getSubscription(
  address: string
): Promise<EmailSubscription> {
  const response = await fetch(`${ENVELOP_API_URL}/subscriber`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return {
    status: data.status,
    feeds: data.subscriptions || []
  };
}

export async function createSubscription() {}

export async function updateSubscription() {}

export async function resendVerificationEmail() {}

export async function getFeedsTypeList(): Promise<
  Record<string, { name: string; description: string }>
> {
  const response = await fetch(`${ENVELOP_API_URL}/subscriptionsList`, {
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return data;
}
