<script setup lang="ts">
import { isSameAddress, ValidatorPool } from '@/helpers/stakedVoteDelegation';
import { _p, _vp } from '@/helpers/utils';
import { useValidatorConfigQuery } from '@/queries/stakedVoteDelegation';

const props = defineProps<{
  validator: ValidatorPool;
  rank: number;
  totalDelegated: bigint;
}>();

const { data: config, isPending } = useValidatorConfigQuery(
  () => props.validator.staker
);

const share = computed(() =>
  props.totalDelegated > 0n
    ? Number(
        (BigInt(props.validator.delegated) * 10000n) / props.totalDelegated
      ) / 10000
    : 0
);
const hasCustomReceiver = computed(
  () =>
    !!config.value &&
    !isSameAddress(config.value.voteReceiver, props.validator.staker)
);
</script>

<template>
  <button
    type="button"
    class="w-full text-left flex items-center gap-3 px-4 py-3 border-b hover:bg-skin-border/20 transition-colors"
  >
    <div class="w-[28px] shrink-0 text-skin-text text-sm" v-text="rank" />
    <div class="flex-1 min-w-0">
      <StakedDelegationAddress
        :address="validator.staker"
        :linked="false"
        :subtitle="
          validator.commission !== null
            ? `${validator.commission / 100}% commission`
            : undefined
        "
      >
        <template #badge>
          <UiPill v-if="validator.exiting" class="whitespace-nowrap">
            Exiting
          </UiPill>
        </template>
      </StakedDelegationAddress>
    </div>
    <div class="hidden md:block w-[200px] shrink-0 truncate">
      <UiLoading v-if="isPending" :size="16" />
      <StakedDelegationAddress
        v-else-if="config && hasCustomReceiver"
        :address="config.voteReceiver"
        :linked="false"
        :size="20"
      />
      <span v-else class="text-skin-text text-[16px]">Staker address</span>
    </div>
    <div class="hidden sm:block w-[110px] shrink-0 text-right">
      <UiLoading v-if="isPending" :size="16" />
      <UiPill
        v-else-if="config"
        :variant="config.acceptsDefaultDelegations ? 'default' : 'secondary'"
        class="whitespace-nowrap"
      >
        {{ config.acceptsDefaultDelegations ? 'Accepting' : 'Declined' }}
      </UiPill>
    </div>
    <div class="w-[110px] sm:w-[150px] shrink-0 text-right leading-[22px]">
      <div class="text-skin-heading truncate">
        {{ _vp(Number(BigInt(validator.delegated) / 10n ** 15n) / 1000) }}
      </div>
      <div class="text-skin-text text-[15px]" v-text="_p(share)" />
    </div>
  </button>
</template>
