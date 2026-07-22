<script setup lang="ts">
import dayjs from 'dayjs';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { _n } from '@/helpers/utils';
import { Payment } from '@/queries/payments';

// Shared payment-history table (SpaceBilling + API keys). A row shows a date +
// "View transaction" only when it has a timestamp (a real on-chain payment);
// grants like the free credit have neither, so they render "—" and no dropdown.
withDefaults(
  defineProps<{
    payments: Payment[];
    isPending: boolean;
    isError: boolean;
    chainId?: string | number;
    loadingMore?: boolean;
  }>(),
  { loadingMore: false }
);

const emit = defineEmits<{
  (e: 'endReached'): void;
}>();

function formatType(type: string): string {
  if (type === 'turbo') return 'snapshot pro';
  if (type === 'topup') return 'top up';
  if (type === 'free') return 'free credit';
  return type;
}
</script>

<template>
  <div>
    <UiSectionHeader class="mt-4" label="Payment history" sticky />
    <UiColumnHeader class="space-x-3">
      <div class="w-[190px] grow sm:grow-0 text-left">Date</div>
      <div class="hidden sm:flex grow">Type</div>
      <div class="w-[150px] flex justify-end">Amount</div>
      <div class="min-w-3.5" />
    </UiColumnHeader>

    <UiLoading v-if="isPending" class="px-4 py-3 block" />
    <UiStateWarning v-else-if="isError" class="px-4 py-3">
      Failed to load payment history.
    </UiStateWarning>
    <UiStateWarning v-else-if="payments.length === 0" class="px-4 py-3">
      No payment history available.
    </UiStateWarning>
    <UiContainerInfiniteScroll
      v-else
      class="px-4"
      :loading-more="loadingMore"
      @end-reached="emit('endReached')"
    >
      <div
        v-for="payment in payments"
        :key="payment.id"
        class="border-b flex space-x-3 py-3"
      >
        <div class="flex grow sm:grow-0 w-[190px] items-center">
          {{
            payment.timestamp
              ? dayjs(payment.timestamp * 1000).format('MMM D, YYYY')
              : '—'
          }}
        </div>
        <div class="hidden sm:flex grow w-0 text-[17px] capitalize">
          {{ formatType(payment.type) }}
        </div>
        <div
          class="w-[150px] flex flex-col sm:shrink-0 text-right justify-center"
        >
          <span class="text-skin-link font-semibold">
            {{ _n(payment.amount_decimal) }}
            {{ payment.token_symbol }}
          </span>
        </div>

        <UiDropdown v-if="chainId && payment.timestamp">
          <template #button>
            <div class="flex items-center h-full">
              <button
                type="button"
                class="text-skin-link"
                aria-label="Payment actions"
              >
                <IH-dots-horizontal />
              </button>
            </div>
          </template>
          <template #items>
            <UiDropdownItem
              :to="
                getGenericExplorerUrl(chainId, payment.id, 'transaction') || ''
              "
            >
              <IH-arrow-sm-right class="-rotate-45" :width="16" />
              View transaction
            </UiDropdownItem>
          </template>
        </UiDropdown>
        <div v-else class="min-w-3.5" />
      </div>
    </UiContainerInfiniteScroll>
  </div>
</template>
