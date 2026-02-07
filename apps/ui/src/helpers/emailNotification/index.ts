import { EmailSubscription } from './types';

const ENVELOP_API_URL = import.meta.env.VITE_ENVELOP_URL;

export type Params = { email: string; subscriptions?: string[] };
export type Method = 'subscribe' | 'update';

export const SubscribeSchema = {
  Subscribe: [
    { name: 'address', type: 'address' },
    { name: 'email', type: 'string' }
  ]
};

export const UpdateSubscriptionsSchema = {
  Subscriptions: [
    { name: 'address', type: 'address' },
    { name: 'email', type: 'string' },
    { name: 'subscriptions', type: 'string[]' }
  ]
};

export const DOMAIN = {
  name: 'snapshot',
  version: '0.1.4'
};

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

export async function send(
  params: Params & { address: string; signature: string },
  method: Method
): Promise<boolean> {
  const response = await fetch(`${ENVELOP_API_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: `snapshot.${method}`,
      params
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return data.result === 'OK';
}

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
