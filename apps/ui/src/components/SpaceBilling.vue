<script setup lang="ts">
import dayjs from 'dayjs';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { _n } from '@/helpers/utils';
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

const { redirectToPortal, isLoading } = useStripeCheckout();

const portalPaymentId = ref<string | null>(null);
const isAddCreditsModalOpen = ref(false);

const chainId = computed(() => getNetwork(props.space.network).chainId);
const payments = computed(() => data.value?.pages.flat() || []);

async function openPortal(paymentId: string) {
  if (isLoading.value) return;

  portalPaymentId.value = paymentId;
  await redirectToPortal(props.space.network);
}
</script>

<template>
  <div>
    <UiContainerSettings
      class="px-4 pt-4"
      title="Billing"
      description="Manage your subscription and view billing information."
    >
      <UiEyebrow class="mb-3 font-medium">Current plan</UiEyebrow>
      <SpaceBillingPlan
        :space="space"
        @add-credits="isAddCreditsModalOpen = true"
      />
    </UiContainerSettings>

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
    <UiStateWarning
      v-else-if="!payments || payments.length === 0"
      class="px-4 py-3"
    >
      No payment history available.
    </UiStateWarning>
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
          <span class="text-skin-link font-semibold">
            {{
              payment.type === 'credits'
                ? _n(payment.amount_decimal, 'standard', {
                    maximumFractionDigits: 6
                  })
                : _n(payment.amount_decimal)
            }}
            {{ payment.token_symbol }}
          </span>
        </div>

        <UiLoading
          v-if="isLoading && portalPaymentId === payment.id"
          class="flex items-center"
        />
        <UiDropdown v-else>
          <template #button>
            <div class="flex items-center h-full">
              <button type="button" class="text-skin-link">
                <IH-dots-horizontal />
              </button>
            </div>
          </template>
          <template #items>
            <UiDropdownItem
              v-if="payment.id.startsWith('stripe:')"
              @click="openPortal(payment.id)"
            >
              <IH-arrow-sm-right class="-rotate-45" :width="16" />
              Manage subscription
            </UiDropdownItem>
            <UiDropdownItem
              v-else
              :to="
                getGenericExplorerUrl(chainId, payment.id, 'transaction') || ''
              "
            >
              <IH-arrow-sm-right class="-rotate-45" :width="16" />
              View transaction
            </UiDropdownItem>
          </template>
        </UiDropdown>
      </div>
    </UiContainerInfiniteScroll>
    <teleport to="#modal">
      <ModalAddCredits
        :open="isAddCreditsModalOpen"
        :space="space"
        @close="isAddCreditsModalOpen = false"
      />
    </teleport>
  </div>
</template>
