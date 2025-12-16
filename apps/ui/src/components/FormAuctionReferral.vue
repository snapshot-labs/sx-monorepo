<script setup lang="ts">
import { isAddress } from '@ethersproject/address';
import { useQueryClient } from '@tanstack/vue-query';
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { REFERRAL_CHAIN_ID } from '@/helpers/auction/referral';
import {
  compareAddresses,
  formatAddress,
  shortenAddress
} from '@/helpers/utils';
import {
  REFERRAL_KEYS,
  useRefereesQuery,
  useUserReferralQuery
} from '@/queries/referral';

const ADDRESS_INPUT_DEFINITION = {
  type: 'string',
  format: 'address',
  title: 'Referee address',
  examples: ['Enter the address of who referred you'],
  showControls: false
};

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
}>();

const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();
const { setReferral } = useAuctionActions(
  toRef(props, 'network'),
  toRef(props, 'auction')
);
const queryClient = useQueryClient();

const referralInput = ref('');
const isModalOpen = ref(false);

const { data: userReferral, isPending: isUserReferralPending } =
  useUserReferralQuery(web3Account);

const {
  data: refereesData,
  fetchNextPage,
  hasNextPage,
  isPending: isRefereesLoading,
  isFetchingNextPage,
  isError: isRefereesError
} = useRefereesQuery();

const inputError = computed(() => {
  if (!referralInput.value) return '';

  if (!isAddress(referralInput.value)) return 'Invalid address';

  if (
    web3Account.value &&
    compareAddresses(referralInput.value, web3Account.value)
  ) {
    return 'You cannot refer yourself';
  }

  return '';
});

const referees = computed(() => refereesData.value?.pages.flat() ?? []);

function handleSetReferral() {
  if (!web3Account.value) {
    modalAccountOpen.value = true;
    return;
  }

  isModalOpen.value = true;
}

function handleConfirmed() {
  referralInput.value = '';
  isModalOpen.value = false;

  queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all });
}
</script>

<template>
  <div class="s-box p-4 space-y-3">
    <UiLoading v-if="web3Account && isUserReferralPending" class="py-3 block" />

    <div
      v-else-if="userReferral"
      class="border rounded-lg text-[17px] bg-skin-input-bg px-3 py-2.5 flex gap-2 flex-col"
    >
      <div class="text-skin-text">Referee</div>
      <div class="flex items-center gap-3">
        <UiStamp :id="userReferral.referee" :size="24" />
        <div class="flex flex-col leading-[22px] truncate">
          <h4
            class="truncate"
            v-text="
              userReferral.refereeName || shortenAddress(userReferral.referee)
            "
          />
          <UiAddress
            :address="formatAddress(userReferral.referee)"
            class="text-[17px] text-skin-text truncate"
          />
        </div>
      </div>
    </div>

    <template v-else>
      <p class="text-skin-text text-sm">
        Set your referral to support whoever referred you. This can only be set
        once.
      </p>

      <UiInputAddress
        v-model="referralInput"
        :definition="ADDRESS_INPUT_DEFINITION"
        :error="inputError"
      />

      <UiButton
        primary
        class="w-full"
        :disabled="!referralInput || !!inputError"
        @click="handleSetReferral"
      >
        Set referee
      </UiButton>
    </template>
  </div>

  <teleport to="#modal">
    <ModalTransactionProgress
      :open="isModalOpen"
      :chain-id="REFERRAL_CHAIN_ID"
      :execute="() => setReferral(referralInput)"
      @confirmed="handleConfirmed"
      @close="isModalOpen = false"
      @cancelled="isModalOpen = false"
    />
  </teleport>

  <div class="border-t border-skin-border">
    <h4 class="eyebrow px-4 py-2">Leaderboard</h4>

    <UiColumnHeader class="overflow-hidden gap-3">
      <div class="flex-1 min-w-0 truncate">Referee</div>
      <div class="w-[80px] text-right truncate">Referrals</div>
    </UiColumnHeader>

    <div class="px-4">
      <UiLoading v-if="isRefereesLoading" class="py-3 block" />

      <UiStateWarning v-else-if="isRefereesError" class="py-3">
        Failed to load leaderboard.
      </UiStateWarning>

      <UiStateWarning v-else-if="referees.length === 0" class="py-3">
        No referees yet.
      </UiStateWarning>

      <UiContainerInfiniteScroll
        v-else
        :loading-more="isFetchingNextPage"
        @end-reached="() => hasNextPage && fetchNextPage()"
      >
        <div
          class="divide-y divide-skin-border flex flex-col justify-center border-b"
        >
          <div
            v-for="referee in referees"
            :key="referee.id"
            class="flex items-center gap-3 py-3"
          >
            <div class="flex-1 min-w-0 flex items-center gap-3 truncate">
              <UiStamp :id="referee.referee" :size="32" />
              <div class="flex flex-col truncate">
                <h4
                  class="truncate"
                  v-text="referee.name || shortenAddress(referee.referee)"
                />
                <UiAddress
                  :address="formatAddress(referee.referee)"
                  class="text-[17px] text-skin-text truncate"
                />
              </div>
            </div>
            <div class="w-[80px] text-right">
              <h4 class="text-skin-link">{{ referee.referral_count }}</h4>
            </div>
          </div>
        </div>
        <template #loading>
          <UiLoading class="py-3 block" />
        </template>
      </UiContainerInfiniteScroll>
    </div>
  </div>
</template>
