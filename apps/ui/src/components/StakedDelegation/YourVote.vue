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

const { data: delegatee, isPending: isDelegateePending } =
  useStakedDelegateeQuery(() => props.account);
const {
  data: memberships,
  isFetching: isFetchingMemberships,
  isError: isMembershipsError,
  progress
} = useMembershipsQuery(() => props.account);

const { explorerUrl } = getStakedDelegationConfig();

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
const votesGoTo = computed(() => {
  if (delegatee.value) {
    return isSameAddress(delegatee.value, props.account)
      ? 'You'
      : shortenVoter(delegatee.value);
  }
  if (!memberships.value?.length) return 'Your validators';
  if (voters.value.length === 1) {
    return isSameAddress(voters.value[0], props.account)
      ? 'You'
      : shortenVoter(voters.value[0]);
  }
  return `${voters.value.length} addresses`;
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
    <div class="p-4 grid grid-cols-1 xs:grid-cols-3 gap-2 xs:gap-3">
      <div
        class="border rounded-lg px-3.5 py-2.5 xs:py-3 flex items-center justify-between gap-2 xs:block"
      >
        <UiEyebrow class="text-skin-text">Staked in pools</UiEyebrow>
        <UiLoading v-if="isFetchingMemberships && !memberships" class="mt-1" />
        <div v-else class="text-skin-heading text-lg truncate">
          {{ _c(totalStake) }} <span class="text-skin-text text-sm">STRK</span>
        </div>
      </div>
      <div
        class="border rounded-lg px-3.5 py-2.5 xs:py-3 flex items-center justify-between gap-2 xs:block"
      >
        <UiEyebrow class="text-skin-text">Validators</UiEyebrow>
        <UiLoading v-if="isFetchingMemberships && !memberships" class="mt-1" />
        <div v-else class="text-skin-heading text-lg">
          {{ memberships?.length ?? 0 }}
        </div>
      </div>
      <div
        class="border rounded-lg px-3.5 py-2.5 xs:py-3 flex items-center justify-between gap-2 xs:block"
      >
        <UiEyebrow class="text-skin-text">Your votes go to</UiEyebrow>
        <UiLoading
          v-if="isDelegateePending || (isFetchingMemberships && !memberships)"
          class="mt-1"
        />
        <div v-else class="text-skin-heading text-lg truncate">
          {{ votesGoTo }}
        </div>
      </div>
    </div>

    <div class="px-4 pb-4">
      <StakedDelegationLiveVotes />
    </div>

    <UiSectionHeader label="Your choice" />
    <div class="p-4">
      <StakedDelegationChoice
        :account="account"
        :delegatee="delegatee"
        :is-loading="isDelegateePending"
        :memberships="memberships"
      />
    </div>

    <UiSectionHeader label="Where your votes go" />
    <div class="p-4 flex flex-col gap-3">
      <StakedDelegationMemberships
        :memberships="memberships"
        :member="account"
        :records="records"
        :is-loading="isFetchingMemberships && !memberships"
        :is-error="isMembershipsError"
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
