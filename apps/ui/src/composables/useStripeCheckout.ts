import { SCHNAPS_URLS } from '@/helpers/constants';

type CheckoutParams = {
  space: string;
  plan: 'monthly' | 'yearly';
  email?: string;
};

type SchnapsResponse = {
  result?: { url?: string };
  error_description?: string;
};

export function useStripeCheckout() {
  async function redirectToCheckout({ space, plan, email }: CheckoutParams) {
    const [network] = space.split(':');
    const baseUrl = SCHNAPS_URLS[network] || SCHNAPS_URLS.s;

    const { origin, pathname, hash } = window.location;
    const base = `${origin}${pathname}${hash.split('?')[0]}`;
    const res = await fetch(`${baseUrl}/stripe/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        space,
        plan,
        email,
        success_url: `${base}?stripe_success=1&space=${encodeURIComponent(space)}`,
        cancel_url: `${origin}${pathname}${hash}`
      })
    });

    const { result, error_description } = ((await res
      .json()
      .catch(err =>
        console.error('[stripe] failed to parse checkout response', err)
      )) ?? {}) as SchnapsResponse;

    if (!res.ok || !result?.url) {
      throw new Error(error_description || 'Failed to start checkout');
    }

    window.location.href = result.url;
  }

  async function getPortalUrl(network: string): Promise<string> {
    const baseUrl = SCHNAPS_URLS[network] || SCHNAPS_URLS.s;
    const res = await fetch(`${baseUrl}/stripe/portal`);

    const { result, error_description } = ((await res
      .json()
      .catch(err =>
        console.error('[stripe] failed to parse portal response', err)
      )) ?? {}) as SchnapsResponse;

    if (!res.ok || !result?.url) {
      throw new Error(error_description || 'Failed to get billing portal URL');
    }

    return result.url;
  }

  return { redirectToCheckout, getPortalUrl };
}
