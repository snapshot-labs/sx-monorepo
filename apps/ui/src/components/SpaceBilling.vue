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

  const daysUntilExpiration = turboExpirationDate.value.diff(dayjs(), 'day');

  if (daysUntilExpiration === 0) {
    return 'Expires today';
  }

  if (daysUntilExpiration < 30) {
    return `${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''} left`;
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
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="flex items-start sm:items-center sm:flex-1">
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
            {{ statusText }}
          </div>

          <UiButton
            :to="{ name: 'space-pro' }"
            class="primary w-full sm:w-auto"
          >
            {{ hasTurbo ? 'Extend plan' : 'Upgrade to Pro' }}
          </UiButton>
        </div>
      </div>
    </UiContainerSettings>

    <UiSectionHeader class="mt-4" label="Payment history" sticky />

    <div
      class="bg-skin-bg border-b sticky top-[112px] lg:top-[113px] z-40 flex w-full font-medium space-x-3 px-4"
    >
      <div class="w-[190px] grow sm:grow-0">Date</div>
      <div class="hidden sm:flex grow">Type</div>
      <div class="w-[150px] flex justify-end">Amount</div>
      <div class="w-[20px]" />
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
      class="px-4"
      :loading-more="isFetchingNextPage"
      @end-reached="hasNextPage && fetchNextPage()"
    >
      <div
        v-for="payment in payments"
        :key="payment.id"
        class="border-b flex space-x-3 py-3"
      >
        <div class="flex grow sm:grow-0 w-[190px] items-center">
          {{ dayjs((payment.timestamp || 0) * 1000).format('MMM D, YYYY') }}
        </div>
        <div class="hidden sm:flex grow w-0 text-[17px] capitalize">
          {{ payment.type === 'turbo' ? 'snapshot pro' : payment.type }}
        </div>
        <div
          class="w-[150px] flex flex-col sm:shrink-0 text-right justify-center"
        >
          <h4 class="text-skin-link font-semibold">
            {{ _n(payment.amount_decimal) }}
            {{ payment.token_symbol }}
          </h4>
        </div>

        <UiDropdown>
          <template #button>
            <div class="flex items-center h-full">
              <button type="button" class="text-skin-link">
                <IH-dots-horizontal />
              </UiButton>
            </div>
          </template>
          <template #items>
            <UiDropdownItem v-slot="{ active }">
              <a
                :href="
                  getGenericExplorerUrl(chainId, payment.id, 'transaction') ||
                  ''
                "
                target="_blank"
                class="flex items-center gap-2"
                :class="{ 'opacity-80': active }"
              >
                <IH-arrow-sm-right class="-rotate-45" :width="16" />
                View transaction
              </a>
            </UiDropdownItem>
          </template>
        </UiDropdown>
      </div>
    </UiContainerInfiniteScroll>
  </div>
</template>
