import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter, toValue } from 'vue';
import { SCHNAPS_URLS } from '@/helpers/constants';

export type SubscriptionStatus = {
  isStripeAvailable: boolean;
  hasActiveSubscription: boolean;
  willCancelAtPeriodEnd: boolean;
  renewsAt: number | null;
};

type SubscriptionResponse = {
  stripeAvailable?: boolean;
  activeSubscription?: boolean;
  cancelAtPeriodEnd?: boolean;
  renewsAt?: number | null;
};

export const SUBSCRIPTION_UNAVAILABLE: SubscriptionStatus = {
  isStripeAvailable: false,
  hasActiveSubscription: false,
  willCancelAtPeriodEnd: false,
  renewsAt: null
};

async function fetchSubscriptionStatus(
  spaceId: string,
  network: string
): Promise<SubscriptionStatus> {
  const space = `${network}:${spaceId}`;
  const baseUrl = SCHNAPS_URLS[network] || SCHNAPS_URLS.s;

  const res = await fetch(
    `${baseUrl}/stripe/subscription?space=${encodeURIComponent(space)}`,
    { signal: AbortSignal.timeout(10_000) }
  );

  if (!res.ok) {
    console.error(
      `[stripe] subscription status request failed (${res.status})`
    );

    if (res.status < 500) return SUBSCRIPTION_UNAVAILABLE;

    throw new Error(`Failed to fetch subscription status (${res.status})`);
  }

  const { result } = ((await res.json().catch(() => ({}))) ?? {}) as {
    result?: SubscriptionResponse;
  };

  return {
    isStripeAvailable: result?.stripeAvailable ?? false,
    hasActiveSubscription: result?.activeSubscription ?? false,
    willCancelAtPeriodEnd: result?.cancelAtPeriodEnd ?? false,
    renewsAt: result?.renewsAt ?? null
  };
}

export function useSubscriptionStatusQuery(
  spaceId: MaybeRefOrGetter<string>,
  network: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: ['stripeSubscription', { spaceId, network }],
    queryFn: () => fetchSubscriptionStatus(toValue(spaceId), toValue(network)),
    retry: 1,
    enabled: () => !!toValue(spaceId)
  });
}
