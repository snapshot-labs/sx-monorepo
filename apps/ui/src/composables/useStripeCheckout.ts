import { SCHNAPS_URLS } from '@/helpers/constants';

type CheckoutParams = {
  space: string;
  plan: 'monthly' | 'yearly';
};

type SchnapsResponse = {
  result?: { url?: string };
  error_description?: string;
};

export function useStripeCheckout() {
  async function redirectToCheckout({ space, plan }: CheckoutParams) {
    const [network] = space.split(':');
    const baseUrl = SCHNAPS_URLS[network] || SCHNAPS_URLS.s;

    const base = window.location.href.split('?')[0];
    const res = await fetch(`${baseUrl}/stripe/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        space,
        plan,
        success_url: `${base}?stripe_success=1`,
        cancel_url: base
      })
    });

    const { result, error_description } = (await res.json()) as SchnapsResponse;

    if (!res.ok || !result?.url) {
      throw new Error(error_description || 'Failed to start checkout');
    }

    window.location.href = result.url;
  }

  async function getPortalUrl(network: string): Promise<string | null> {
    const baseUrl = SCHNAPS_URLS[network] || SCHNAPS_URLS.s;
    const res = await fetch(`${baseUrl}/stripe/portal`);
    const { result } = (await res.json()) as SchnapsResponse;
    return result?.url ?? null;
  }

  return { redirectToCheckout, getPortalUrl };
}
