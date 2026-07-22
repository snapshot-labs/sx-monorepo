<script setup lang="ts">
import dayjs from 'dayjs';
import { getNetwork } from '@/networks';
import { usePaymentsQuery } from '@/queries/payments';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

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

const chainId = computed(() => getNetwork(props.space.network).chainId);
const turboExpirationDate = computed(() =>
  dayjs(props.space.turbo_expiration * 1000)
);
const payments = computed(() => data.value?.pages.flat() || []);
const statusText = computed(() => {
  if (!props.space.turbo) return 'Free';

  const daysUntilExpiration = turboExpirationDate.value.diff(dayjs(), 'day');

  if (!props.space.turbo_expiration) {
    return '';
  }

  if (daysUntilExpiration === 0) {
    return 'Expires today';
  }

  if (daysUntilExpiration < 0) {
    return 'Expired';
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
      <UiEyebrow class="mb-3 font-medium">Current plan</UiEyebrow>

      <div class="border rounded-xl p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="flex items-start sm:items-center sm:flex-1">
            <div class="flex-1">
              <h5 class="text-lg font-semibold text-skin-heading">
                {{ props.space.turbo ? 'Snapshot Pro' : 'Basic plan' }}
              </h5>
              <p class="text-sm text-skin-text">
                <template
                  v-if="props.space.turbo && props.space.turbo_expiration"
                >
                  Valid until
                  <span class="font-semibold">{{
                    turboExpirationDate.format('MMM D, YYYY')
                  }}</span>
                </template>
                <template
                  v-else-if="props.space.turbo && !props.space.turbo_expiration"
                >
                  Unknown expiration date
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
            primary
            class="w-full sm:w-auto"
          >
            {{ props.space.turbo ? 'Extend plan' : 'Upgrade to Pro' }}
          </UiButton>
        </div>
      </div>
    </UiContainerSettings>

    <PaymentHistory
      :payments="payments"
      :is-pending="isPending"
      :is-error="isError"
      :chain-id="chainId"
      :loading-more="isFetchingNextPage"
      @end-reached="hasNextPage && fetchNextPage()"
    />
  </div>
</template>
