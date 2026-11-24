<script setup lang="ts">
import { isSameAddress, Membership } from '@/helpers/stakedVoteDelegation';
import { VotingRecord } from '@/helpers/stakedVoteDelegation/votingRecord';
import { _c, _p } from '@/helpers/utils';

const props = defineProps<{
  memberships?: Membership[];
  isLoading: boolean;
  isError: boolean;
  progress: { done: number; total: number };
  /** The delegator, to show "You" when the vote stays with them. */
  member?: string;
  /** Voting records keyed by lowercased voting address. */
  records?: Record<string, VotingRecord>;
  /** Showing a cached result while a fresh scan runs. */
  isRefreshing?: boolean;
}>();

const totalStake = computed(() =>
  (props.memberships ?? []).reduce((sum, m) => sum + m.amount, 0n)
);

function share(amount: bigint) {
  if (totalStake.value === 0n) return 0;
  return Number((amount * 10000n) / totalStake.value) / 10000;
}
</script>

<template>
  <div class="border rounded-lg overflow-hidden">
    <div
      v-if="isLoading"
      class="px-4 py-5 flex flex-col items-center gap-2.5 text-center"
    >
      <UiLoading />
      <div class="text-skin-text text-[16px]">
        Finding your pools<template v-if="progress.total">
          ({{ progress.done }} of {{ progress.total }} checked)</template
        >…
      </div>
      <div
        v-if="progress.total"
        class="w-full max-w-[280px] h-1 rounded-full bg-skin-border overflow-hidden"
      >
        <div
          class="h-full bg-skin-link transition-all"
          :style="{ width: _p(progress.done / progress.total) }"
        />
      </div>
    </div>
    <UiStateWarning v-else-if="isError" class="px-4 py-3">
      Could not load pools. Please try again.
    </UiStateWarning>
    <div
      v-else-if="!memberships?.length"
      class="px-4 py-3 text-skin-text text-[16px]"
    >
      <slot name="empty">No stake in a STRK delegation pool.</slot>
    </div>
    <template v-else>
      <div
        class="hidden md:flex px-4 py-2 border-b text-skin-text text-sm font-medium gap-3"
      >
        <div class="w-[30%]">Validator</div>
        <div v-if="records" class="w-[110px] shrink-0">
          <span title="Votes cast on the last 6 Starknet votes and polls">
            Record
          </span>
        </div>
        <div class="w-[24%]">Stake</div>
        <div class="flex-1 flex items-center justify-between gap-2">
          <span>Votes with</span>
          <span
            v-if="isRefreshing"
            class="flex items-center gap-1.5 font-normal"
          >
            <UiLoading :size="12" />
            Checking for changes…
          </span>
        </div>
      </div>
      <div
        v-for="membership in memberships"
        :key="membership.validator.pool"
        class="flex flex-col md:flex-row md:items-center gap-2.5 md:gap-3 px-4 py-3 border-b last:border-b-0"
      >
        <div class="md:w-[30%] min-w-0">
          <StakedDelegationAddress
            :address="membership.validator.staker"
            :subtitle="
              membership.validator.commission !== null
                ? `${membership.validator.commission / 100}% commission`
                : undefined
            "
          />
        </div>
        <div
          v-if="records"
          class="md:w-[110px] shrink-0 flex items-center gap-2"
        >
          <span class="md:hidden text-skin-text text-sm">Record</span>
          <StakedDelegationRecordDots
            :record="records[membership.config.voteReceiver.toLowerCase()]"
          />
        </div>
        <div class="md:w-[24%] flex flex-col gap-1">
          <div
            class="flex items-baseline justify-between md:justify-start gap-2"
          >
            <span class="text-skin-heading whitespace-nowrap">
              {{ _c(membership.amount) }} STRK
            </span>
            <span class="text-skin-text text-sm">
              {{ _p(share(membership.amount)) }}
            </span>
          </div>
          <div
            class="h-1 w-full max-w-[160px] rounded-full bg-skin-border overflow-hidden"
          >
            <div
              class="h-full bg-skin-link"
              :style="{ width: _p(share(membership.amount)) }"
            />
          </div>
        </div>
        <div class="flex-1 min-w-0 flex items-center gap-2">
          <span class="md:hidden text-skin-text text-sm shrink-0">
            Votes with
          </span>
          <StakedDelegationAddress
            :address="membership.votesWith"
            :size="24"
            :label="
              member && isSameAddress(membership.votesWith, member)
                ? 'You'
                : undefined
            "
          >
            <template #subtitle>
              <StakedDelegationReasonPill :reason="membership.reason" />
            </template>
          </StakedDelegationAddress>
        </div>
      </div>
    </template>
  </div>
</template>
