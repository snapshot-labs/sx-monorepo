<script setup lang="ts">
import {
  getStakedDelegationConfig,
  isSameAddress,
  shortenVoter
} from '@/helpers/stakedVoteDelegation';
import { _c } from '@/helpers/utils';
import {
  useMembershipsQuery,
  useStakedDelegateeQuery,
  useVotingRecordsQuery
} from '@/queries/stakedVoteDelegation';

const props = defineProps<{ account: string }>();
defineEmits<{ (e: 'browseValidators'): void }>();

const { web3 } = useWeb3();
const { modalAccountOpen } = useModal();
const { lastSaved } = useStakedDelegationActions();

const isChoiceOpen = ref(false);

const { data: delegatee, isPending: isDelegateePending } =
  useStakedDelegateeQuery(() => props.account);
const {
  data: memberships,
  isFetching: isFetchingMemberships,
  isError: isMembershipsError,
  isPlaceholderData: isMembershipsCached,
  progress
} = useMembershipsQuery(() => props.account);

const { explorerUrl } = getStakedDelegationConfig();

const isStatusLoading = computed(
  () =>
    isDelegateePending.value ||
    (isFetchingMemberships.value && !memberships.value)
);

const isHowItWorksOpen = ref(false);

const { data: records } = useVotingRecordsQuery(() =>
  (memberships.value ?? []).map(m => m.config.voteReceiver)
);

const totalStake = computed(() =>
  (memberships.value ?? []).reduce((sum, m) => sum + m.amount, 0n)
);
const voters = computed(() => {
  const unique = new Set(
    (memberships.value ?? []).map(m => m.votesWith.toLowerCase())
  );
  return [...unique];
});
const mode = computed<'default' | 'self' | 'delegate'>(() => {
  if (!delegatee.value) return 'default';
  return isSameAddress(delegatee.value, props.account) ? 'self' : 'delegate';
});

const headline = computed(() => {
  if (mode.value === 'self') return 'You vote with all of your stake';
  if (mode.value === 'delegate') {
    return `${shortenVoter(delegatee.value!)} votes with all of your stake`;
  }
  if (!memberships.value?.length) return 'Your validators will vote for you';
  return 'Your validators vote for you';
});

const detail = computed(() => {
  const pools = memberships.value?.length ?? 0;
  if (!pools) return 'No stake in a delegation pool yet';
  const stake = `${_c(totalStake.value)} STRK in ${pools} ${pools === 1 ? 'pool' : 'pools'}`;
  if (mode.value !== 'default') return `${stake} · your choice`;
  const n = voters.value.length;
  return `${stake} · default · votes go to ${n} ${n === 1 ? 'address' : 'addresses'}`;
});
</script>

<template>
  <div v-if="!web3.account" class="p-4 flex flex-col gap-4">
    <div
      class="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div class="flex-1">
        <h4 class="text-skin-heading">See where your staked STRK votes go</h4>
        <p class="text-skin-text text-[16px] leading-6">
          Connect the Starknet wallet you stake with to check and change your
          choice.
        </p>
      </div>
      <UiButton primary class="shrink-0" @click="modalAccountOpen = true">
        Connect wallet
      </UiButton>
    </div>
    <StakedDelegationHowItWorks />
  </div>

  <div v-else-if="!account" class="p-4">
    <UiMessage type="info">
      Staked STRK lives on Starknet. Connect a Starknet wallet (Argent or
      Braavos) to manage your delegation.
    </UiMessage>
  </div>

  <template v-else>
    <div class="p-4">
      <div class="border rounded-lg">
        <div class="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <UiStamp
              v-if="mode === 'delegate' && delegatee"
              :id="delegatee"
              type="avatar"
              :size="44"
              class="shrink-0"
            />
            <div
              v-else
              class="size-[44px] shrink-0 rounded-full bg-skin-link text-skin-bg flex items-center justify-center"
            >
              <IH-user v-if="mode === 'self'" class="size-[20px]" />
              <IH-user-group v-else class="size-[20px]" />
            </div>
            <div class="min-w-0">
              <UiEyebrow class="text-skin-text">Your vote</UiEyebrow>
              <UiLoading v-if="isStatusLoading" class="block mt-1" />
              <template v-else>
                <h3 class="text-skin-heading leading-6" v-text="headline" />
                <div
                  class="text-skin-text text-[16px] leading-[22px]"
                  v-text="detail"
                />
              </template>
            </div>
          </div>
          <UiButton
            primary
            class="shrink-0 sm:min-w-[120px]"
            :disabled="isStatusLoading"
            @click="isChoiceOpen = true"
          >
            Change
          </UiButton>
        </div>
        <div class="border-t px-4 py-2.5 flex flex-col gap-1.5">
          <div
            v-if="lastSaved"
            class="flex items-center gap-1.5 text-skin-success text-[15px]"
          >
            <IH-check-circle class="shrink-0" />
            Saved on-chain.
            <AppLink
              :to="`${explorerUrl}/tx/${lastSaved.txHash}`"
              class="text-skin-link flex items-center gap-0.5"
            >
              View transaction
              <IH-arrow-sm-right class="-rotate-45" />
            </AppLink>
          </div>
          <StakedDelegationLiveVotes />
        </div>
      </div>
    </div>

    <StakedDelegationChoiceModal
      :open="isChoiceOpen"
      :account="account"
      :delegatee="delegatee"
      :memberships="memberships"
      @close="isChoiceOpen = false"
    />

    <UiSectionHeader label="Where your votes go" />
    <div class="p-4 flex flex-col gap-3">
      <StakedDelegationMemberships
        :memberships="memberships"
        :member="account"
        :is-own="true"
        :records="records"
        :is-loading="isFetchingMemberships && !memberships"
        :is-error="isMembershipsError"
        :is-refreshing="isMembershipsCached"
        :progress="progress"
      >
        <template #empty>
          <div class="flex flex-col items-start gap-2.5">
            <span>
              You have no STRK in a delegation pool on this network. Your choice
              is saved and applies as soon as you stake.
            </span>
            <div class="flex flex-wrap gap-2.5">
              <UiButton :to="`${explorerUrl}/staking`" primary>
                Stake STRK
              </UiButton>
              <UiButton @click="$emit('browseValidators')">
                Browse validators
              </UiButton>
            </div>
          </div>
        </template>
      </StakedDelegationMemberships>

      <button
        type="button"
        class="flex items-center gap-1 text-skin-link text-[16px] self-start"
        @click="isHowItWorksOpen = !isHowItWorksOpen"
      >
        <IH-question-mark-circle />
        How does this work?
        <IH-chevron-down
          class="transition-transform"
          :class="{ 'rotate-180': isHowItWorksOpen }"
        />
      </button>
      <StakedDelegationHowItWorks v-if="isHowItWorksOpen" />
    </div>
  </template>
</template>
