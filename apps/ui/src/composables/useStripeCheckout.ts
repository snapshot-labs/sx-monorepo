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
  const isLoading = ref(false);

  // A Back navigation from Stripe restores the page from bfcache with isLoading
  // still set, so reset it here instead of at every call site.
  useEventListener(window, 'pageshow', (event: PageTransitionEvent) => {
    if (event.persisted) isLoading.value = false;
  });

  async function redirectToCheckout({ space, plan }: CheckoutParams) {
    isLoading.value = true;
    try {
      const [network] = space.split(':');
      const baseUrl = SCHNAPS_URLS[network] || SCHNAPS_URLS.s;

      const { origin, pathname, hash } = window.location;
      const base = `${origin}${pathname}${hash.split('?')[0]}`;
      const res = await fetch(`${baseUrl}/stripe/create`, {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space,
          plan,
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
    } catch (err) {
      isLoading.value = false;
      throw err;
    }
  }

  async function getPortalUrl(network: string): Promise<string> {
    isLoading.value = true;
    try {
      const baseUrl = SCHNAPS_URLS[network] || SCHNAPS_URLS.s;
      const res = await fetch(`${baseUrl}/stripe/portal`);

      const { result, error_description } = ((await res
        .json()
        .catch(err =>
          console.error('[stripe] failed to parse portal response', err)
        )) ?? {}) as SchnapsResponse;

      if (!res.ok || !result?.url) {
        throw new Error(
          error_description || 'Failed to get billing portal URL'
        );
      }

      return result.url;
    } catch (err) {
      isLoading.value = false;
      throw err;
    }
  }

  return { redirectToCheckout, getPortalUrl, isLoading };
}
