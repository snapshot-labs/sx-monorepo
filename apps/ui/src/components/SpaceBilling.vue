<script setup lang="ts">
import dayjs from 'dayjs';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { _n } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { usePaymentsQuery } from '@/queries/payments';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const network = computed(() => props.space.network);
const chainId = computed(() => getNetwork(network.value).chainId);

const hasTurbo = computed(() => props.space.turbo);
const turboExpirationDate = computed(() =>
  dayjs(props.space.turbo_expiration * 1000)
);
const daysUntilExpiration = computed(() => {
  if (!hasTurbo.value) return null;
  return turboExpirationDate.value.diff(dayjs(), 'day');
});

const {
  data,
  isPending,
  isError,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = usePaymentsQuery(
  toRef(() => props.space.id),
  toRef(() => props.space.network)
);

const payments = computed(() => data.value?.pages.flat() || []);

const statusText = computed(() => {
  if (!hasTurbo.value) return 'Free';
  if (daysUntilExpiration.value !== null && daysUntilExpiration.value < 30) {
    const days = daysUntilExpiration.value;
    return `${days} day${days !== 1 ? 's' : ''} left`;
  }
  return 'Active';
});
</script>

<template>
  <div>
    <UiContainerSettings
      class="px-4 pt-4"
      title="Billing"
      description="Manage your subscription and view billing information."
    >
      <h4 class="eyebrow mb-3 font-medium">Current plan</h4>

      <div class="border rounded-xl p-4">
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
        >
          <div
            class="flex items-start sm:items-center justify-between gap-3 sm:flex-1"
          >
            <div class="flex-1">
              <h5 class="text-lg font-semibold text-skin-heading">
                {{ hasTurbo ? 'Snapshot Pro' : 'Basic plan' }}
              </h5>
              <p class="text-sm text-skin-text">
                <template v-if="hasTurbo">
                  Valid until
                  <span class="font-semibold">{{
                    turboExpirationDate.format('MMM D, YYYY')
                  }}</span>
                </template>
                <template v-else>
                  Upgrade to Pro for premium features
                </template>
              </p>
            </div>

            <span
              class="px-2.5 py-1 rounded-md border bg-skin-border/20 text-xs shrink-0"
              >{{ statusText }}</span
            >
          </div>

          <UiButton
            :to="{ name: 'space-pro' }"
            class="primary w-full sm:w-auto text-center"
          >
            {{ hasTurbo ? 'Extend plan' : 'Upgrade to Pro' }}
          </UiButton>
        </div>
      </div>
    </UiContainerSettings>

    <UiSectionHeader class="mt-4" label="Payment history" sticky />

    <div
      class="bg-skin-bg border-b sticky top-[112px] lg:top-[113px] z-40 flex w-full font-medium"
    >
      <div class="flex truncate pl-4">Date</div>
      <div class="flex grow justify-end pr-4">Amount</div>
    </div>

    <UiLoading v-if="isPending" class="px-4 py-3 block" />
    <div
      v-else-if="isError || !payments || payments.length === 0"
      class="px-4 py-3 flex items-center text-skin-link space-x-2"
    >
      <IH-exclamation-circle class="shrink-0" />
      <span v-if="isError">Failed to load payment history.</span>
      <span v-else>No payment history available.</span>
    </div>
    <UiContainerInfiniteScroll
      v-else
      :loading-more="isFetchingNextPage"
      @end-reached="hasNextPage && fetchNextPage()"
    >
      <div v-for="payment in payments" :key="payment.id" class="border-b flex">
        <div class="py-3 pl-4">
          {{ dayjs((payment.timestamp || 0) * 1000).format('MMM D, YYYY') }}
        </div>
        <div class="flex grow justify-end py-3 pr-4">
          <AppLink
            :to="
              getGenericExplorerUrl(chainId, payment.id, 'transaction') || ''
            "
            class="font-semibold flex gap-1"
          >
            {{ _n(payment.amount_decimal) }}
            {{ payment.token_symbol }}
            <IH-arrow-top-right-on-square class="size-3 mt-1 shrink-0" />
          </AppLink>
        </div>
      </div>
    </UiContainerInfiniteScroll>
  </div>
</template>
