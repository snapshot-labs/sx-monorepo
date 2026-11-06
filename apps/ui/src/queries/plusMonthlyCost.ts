import { useQuery } from '@tanstack/vue-query';
import { computed, MaybeRefOrGetter, toValue } from 'vue';
import { isSettingsLoaded, plusFees } from '@/composables/useSettings';
import { getEthPrice } from '@/helpers/prices';
import { HUB_URLS } from '@/networks/offchain';
import { Space } from '@/types';

const MONTHS = 3;
// Only vote counts, so the response stays small
const QUERY = `query ($space: String!, $created: Int!) {
  proposals(first: 1000, where: { space: $space, created_gte: $created }) { votes }
}`;

// What Plus would cost per month in USD, at the space's 3-month average
export async function fetchPlusMonthlyCost(
  space: Space,
  fees: { proposal: number; vote: number }
): Promise<number> {
  const created = Math.floor(Date.now() / 1e3) - MONTHS * 30 * 86400;
  const res = await fetch(HUB_URLS[space.network] as string, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { space: space.id, created }
    })
  });
  const { data } = (await res.json()) as {
    data: { proposals: { votes: number }[] };
  };

  const monthlyEth =
    data.proposals.reduce(
      (sum, { votes }) => sum + fees.proposal + votes * fees.vote,
      0
    ) / MONTHS;
  if (!monthlyEth) return 0;

  // The ETH price is only needed when there is activity to price
  const ethPrice = await getEthPrice();
  if (!ethPrice) throw new Error('ETH price unavailable');
  return monthlyEth * ethPrice;
}

export function usePlusMonthlyCostQuery(
  space: MaybeRefOrGetter<Space | undefined>
) {
  return useQuery({
    queryKey: [
      'plusMonthlyCost',
      computed(() => {
        const value = toValue(space);
        return value && `${value.network}:${value.id}`;
      }),
      plusFees
    ],
    queryFn: () =>
      fetchPlusMonthlyCost(toValue(space) as Space, plusFees.value),
    // Fees come from the hub options, wait for them
    enabled: () => !!toValue(space) && isSettingsLoaded.value,
    staleTime: 60 * 60 * 1000
  });
}
