<script setup lang="ts">
import { Membership } from '@/helpers/stakedVoteDelegation';
import { _c, _p } from '@/helpers/utils';

const props = defineProps<{
  memberships?: Membership[];
  isLoading: boolean;
  isError: boolean;
  progress: { done: number; total: number };
  emptyText: string;
}>();

const totalStake = computed(() =>
  (props.memberships ?? []).reduce((sum, m) => sum + m.amount, 0n)
);
</script>

<template>
  <div class="border rounded-lg overflow-hidden">
    <div
      v-if="isLoading"
      class="px-4 py-5 flex flex-col items-center gap-2.5 text-center"
    >
      <UiLoading />
      <div class="text-skin-text text-[16px]">
        Checking {{ progress.total || '' }} STRK delegation pools…
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
    <UiStateWarning v-else-if="!memberships?.length" class="px-4 py-3">
      {{ emptyText }}
    </UiStateWarning>
    <template v-else>
      <div
        class="hidden sm:flex px-4 py-2 border-b text-skin-text text-sm font-medium gap-3"
      >
        <div class="w-[38%]">Validator</div>
        <div class="w-[22%] text-right">Your stake</div>
        <div class="flex-1">Votes with</div>
      </div>
      <div
        v-for="membership in memberships"
        :key="membership.validator.pool"
        class="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 px-4 py-3 border-b last:border-b-0"
      >
        <div class="sm:w-[38%] min-w-0">
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
          class="sm:w-[22%] sm:text-right text-skin-heading whitespace-nowrap"
        >
          {{ _c(membership.amount) }} STRK
        </div>
        <div class="flex-1 min-w-0 flex items-center gap-2.5">
          <IH-arrow-sm-right class="shrink-0 text-skin-text hidden sm:block" />
          <StakedDelegationAddress :address="membership.votesWith" :size="24">
            <template #badge>
              <StakedDelegationReasonPill :reason="membership.reason" />
            </template>
          </StakedDelegationAddress>
        </div>
      </div>
      <div
        v-if="memberships.length > 1"
        class="flex justify-between px-4 py-2.5 bg-skin-border/30 text-[16px]"
      >
        <span class="text-skin-text">Total staked in pools</span>
        <span class="text-skin-heading">{{ _c(totalStake) }} STRK</span>
      </div>
    </template>
  </div>
</template>
