<script setup lang="ts">
import { isAddress } from '@ethersproject/address';
import { useQueryClient } from '@tanstack/vue-query';
import { compareAddresses, shortenAddress, sleep } from '@/helpers/utils';
import {
  REFERRAL_KEYS,
  useRefereesQuery,
  useUserReferralQuery
} from '@/queries/referral';

const props = defineProps<{
  setReferral: (referee: string) => Promise<{ hash: string } | null>;
}>();

const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();
const queryClient = useQueryClient();

const referralInput = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

const isSelfReferral = computed(
  () =>
    web3Account.value &&
    compareAddresses(referralInput.value, web3Account.value)
);

const canSubmit = computed(() => {
  if (!web3Account.value || !referralInput.value) return false;
  try {
    return isAddress(referralInput.value) && !isSelfReferral.value;
  } catch {
    return false;
  }
});

const { data: userReferral, isLoading: isUserReferralLoading } =
  useUserReferralQuery(web3Account);

const {
  data: refereesData,
  fetchNextPage,
  hasNextPage,
  isPending: isRefereesLoading,
  isFetchingNextPage,
  isError: isRefereesError
} = useRefereesQuery();

const referees = computed(() => refereesData.value?.pages.flat() ?? []);

function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

async function handleSetReferral() {
  if (!canSubmit.value) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await props.setReferral(referralInput.value);

    referralInput.value = '';

    await sleep(5000);

    queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all });
  } catch (e) {
    errorMessage.value = (e as Error).message || 'Failed to set referee';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="s-box p-4 space-y-3">
    <UiLoading v-if="isUserReferralLoading" class="py-3 block" />
    <template v-else-if="web3Account">
      <div
        v-if="userReferral"
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
              :address="userReferral.referee"
              class="text-[17px] text-skin-text truncate"
            />
          </div>
        </div>
      </div>

      <template v-else>
        <p class="text-skin-text text-sm">
          Set your referral to support whoever referred you. This can only be
          set once.
        </p>

        <UiInputAddress
          v-model="referralInput"
          :definition="{
            type: 'string',
            format: 'address',
            title: 'Referee address',
            examples: ['Enter the address of who referred you'],
            showControls: false
          }"
          :error="isSelfReferral ? 'You cannot refer yourself' : errorMessage"
        />

        <UiButton
          primary
          class="w-full"
          :disabled="!canSubmit || isSubmitting"
          :loading="isSubmitting"
          @click="handleSetReferral"
        >
          Set referee
        </UiButton>
      </template>
    </template>

    <template v-else>
      <p class="text-skin-text text-sm">
        Connect your wallet to set a referral.
      </p>
      <UiButton class="w-full" @click="modalAccountOpen = true">
        Connect wallet
      </UiButton>
    </template>
  </div>

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
        @end-reached="handleEndReached"
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
                  :address="referee.referee"
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
