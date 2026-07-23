import { SCHNAPS_URLS } from '@/helpers/constants';

type CheckoutParams = {
  space: string;
  plan: 'monthly' | 'yearly';
  ref?: string;
};

type SchnapsResponse = {
  result?: { url?: string };
  error_description?: string;
};

export type SubscriptionStatus = {
  stripeAvailable: boolean;
  activeSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  renewsAt: number | null;
};

export function useStripeCheckout() {
  const uiStore = useUiStore();

  const isLoading = ref(false);

  // A Back navigation from Stripe restores the page from bfcache with isLoading
  // still set, so reset it here instead of at every call site.
  useEventListener(window, 'pageshow', (event: PageTransitionEvent) => {
    if (event.persisted) isLoading.value = false;
  });

  async function redirectToCheckout({ space, plan, ref }: CheckoutParams) {
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
          ref,
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

  async function redirectToPortal(network: string) {
    if (isLoading.value) return;

    try {
      window.location.href = await getPortalUrl(network);
    } catch (err) {
      console.error('[stripe] portal failed', err);
      uiStore.addNotification(
        'error',
        err instanceof Error ? err.message : 'Failed to open the billing portal'
      );
    }
  }

  async function getSubscriptionStatus(
    space: string
  ): Promise<SubscriptionStatus> {
    // Fails closed: on any error the card option is hidden, crypto still works
    const fallback: SubscriptionStatus = {
      stripeAvailable: false,
      activeSubscription: false,
      cancelAtPeriodEnd: false,
      renewsAt: null
    };
    const [network] = space.split(':');
    const baseUrl = SCHNAPS_URLS[network] || SCHNAPS_URLS.s;
    try {
      const res = await fetch(
        `${baseUrl}/stripe/subscription?space=${encodeURIComponent(space)}`,
        { signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) return fallback;
      const { result } = ((await res.json().catch(() => ({}))) ?? {}) as {
        result?: Partial<SubscriptionStatus>;
      };
      return {
        stripeAvailable: result?.stripeAvailable ?? false,
        activeSubscription: result?.activeSubscription ?? false,
        cancelAtPeriodEnd: result?.cancelAtPeriodEnd ?? false,
        renewsAt: result?.renewsAt ?? null
      };
    } catch (err) {
      console.error('[stripe] subscription status check failed', err);
      return fallback;
    }
  }

  return {
    redirectToCheckout,
    redirectToPortal,
    getSubscriptionStatus,
    isLoading
  };
}
