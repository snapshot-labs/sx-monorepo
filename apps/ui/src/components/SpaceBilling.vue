<script setup lang="ts">
import dayjs from 'dayjs';
import { Payment, usePayments } from '@/composables/usePayments';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { _n } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const hasTurbo = computed(() => props.space.turbo);
const turboExpirationDate = computed(() => {
  return dayjs(props.space.turbo_expiration * 1000);
});

const daysUntilExpiration = computed(() => {
  if (!turboExpirationDate.value) return null;
  return turboExpirationDate.value.diff(dayjs(), 'day');
});

const spaceId = computed(() => `${props.space.network}:${props.space.id}`);
const network = computed(() => getNetwork(props.space.network));

const { data: payments, isPending, isError } = usePayments(spaceId);

const statusText = computed(() => {
  if (!hasTurbo.value) return 'Free';
  if (daysUntilExpiration.value !== null && daysUntilExpiration.value < 30) {
    const days = daysUntilExpiration.value;
    return `${days} day${days !== 1 ? 's' : ''} left`;
  }
  return 'Active';
});

function formatAmount(payment: Payment): string {
  try {
    const num = parseFloat(payment.amount_decimal);

    return _n(num, 'standard', {
      maximumFractionDigits: 0
    });
  } catch (error) {
    console.error('Failed to format amount:', {
      amount: payment.amount_decimal,
      token: payment.token_symbol,
      error
    });
    return payment.amount_decimal;
  }
}
</script>

<template>
  <div>
    <UiContainerSettings
      class="px-4 pt-4"
      title="Billing"
      description="Manage your Snapshot Pro subscription and view billing information."
    >
      <h4 class="eyebrow mb-3 font-medium">Current plan</h4>

      <div class="border border-skin-border rounded-xl bg-skin-bg p-4">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <div class="flex-1">
            <h5 class="text-lg font-semibold text-skin-heading">
              {{ hasTurbo ? 'Snapshot Pro' : 'Basic plan' }}
            </h5>
            <p class="text-sm text-skin-text mt-1">
              <template v-if="hasTurbo && turboExpirationDate">
                Valid until
                <span class="font-semibold">{{
                  turboExpirationDate.format('MMM D, YYYY')
                }}</span>
              </template>
              <template v-else> Upgrade to Pro for premium features </template>
            </p>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-skin-border bg-skin-border/20 text-skin-text text-xs font-medium shrink-0"
              >{{ statusText }}</span
            >

            <UiButton
              :to="{ name: 'space-pro' }"
              class="primary w-full sm:w-auto"
            >
              {{ hasTurbo ? 'Extend plan' : 'Upgrade to Pro' }}
            </UiButton>
          </div>
        </div>
      </div>
    </UiContainerSettings>

    <UiSectionHeader class="mt-4" label="Payment history" sticky />
    <div class="text-left table-fixed w-full">
      <div
        class="bg-skin-bg border-b sticky top-[112px] lg:top-[113px] z-40 flex w-full font-medium space-x-3"
      >
        <div class="w-[200px] flex items-center truncate pl-4">Date</div>
        <div class="grow flex items-center justify-end truncate pr-4">
          Amount
        </div>
      </div>

      <UiLoading v-if="isPending" class="pl-4 py-3 block" />
      <div
        v-else-if="isError || !payments || payments.length === 0"
        class="pl-4 py-3 flex items-center space-x-2"
      >
        <IH-exclamation-circle class="inline-block shrink-0" />
        <span v-if="isError">Failed to load payment history.</span>
        <span v-else>No payment history available.</span>
      </div>
      <template v-else>
        <div
          v-for="payment in payments"
          :key="payment.id"
          class="border-b flex space-x-3"
        >
          <div class="w-[200px] flex items-center py-3 pl-4 text-skin-text">
            {{
              payment.timestamp
                ? dayjs(payment.timestamp * 1000).format('MMM D, YYYY')
                : '—'
            }}
          </div>
          <div class="grow flex justify-end py-3 pr-4">
            <AppLink
              :to="
                getGenericExplorerUrl(
                  network.chainId,
                  payment.id,
                  'transaction'
                ) || ''
              "
              class="text-skin-link hover:text-skin-link/80 transition-colors font-semibold flex items-center gap-1"
              :aria-label="`View transaction for ${formatAmount(payment)} ${payment.token_symbol} on block explorer. Opens in new tab.`"
              hide-external-icon
            >
              <span class="truncate">
                {{ formatAmount(payment) }}
                {{ payment.token_symbol }}
              </span>
              <IH-arrow-top-right-on-square class="size-3 -mt-1" />
            </AppLink>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
