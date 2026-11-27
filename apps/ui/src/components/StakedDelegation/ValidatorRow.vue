<script setup lang="ts">
import {
  getStakedDelegationConfig,
  isSameAddress,
  totalStake,
  ValidatorConfig,
  ValidatorPool
} from '@/helpers/stakedVoteDelegation';
import { VotingRecord } from '@/helpers/stakedVoteDelegation/votingRecord';
import { _p, _vp, shortenAddress } from '@/helpers/utils';

const props = defineProps<{
  validator: ValidatorPool;
  rank: number;
  /** Share of all STRK stake (0–1). */
  share: number;
  record?: VotingRecord;
  isRecordLoading?: boolean;
  config?: ValidatorConfig;
  /** Connected wallet's stake with this validator, in wei. */
  yourStake?: bigint;
  showYourStake: boolean;
}>();

defineEmits<{ (e: 'select'): void }>();

const { explorerUrl } = getStakedDelegationConfig();
const { getProfile } = useSnapshotProfiles();

function strk(wei: bigint | string) {
  return _vp(Number(BigInt(wei) / 10n ** 15n) / 1000);
}

const total = computed(() => totalStake(props.validator));
const hasCustomReceiver = computed(
  () =>
    !!props.config &&
    !isSameAddress(props.config.voteReceiver, props.validator.staker)
);
const uptime = computed(() => props.validator.liveness);
const uptimeColor = computed(() => {
  if (uptime.value === undefined) return 'bg-skin-border';
  if (uptime.value >= 0.95) return 'bg-skin-success';
  if (uptime.value >= 0.8) return 'bg-skin-text';
  return 'bg-skin-danger';
});
const isYours = computed(() => (props.yourStake ?? 0n) > 0n);

/** Second line: who votes, or the address when a name is shown above it. */
const subtitle = computed(() => {
  if (hasCustomReceiver.value && props.config) {
    return `Votes via ${shortenAddress(props.config.voteReceiver)}`;
  }
  const hasName =
    !!props.validator.name || !!getProfile(props.validator.staker)?.name;
  return hasName ? shortenAddress(props.validator.staker) : '';
});
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="flex items-center gap-3 px-4 py-3 border-b hover:bg-skin-border/20 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-skin-link"
    :class="{ 'shadow-[inset_3px_0_0_0_rgb(var(--link))]': isYours }"
    @click="$emit('select')"
    @keydown.enter="$emit('select')"
  >
    <div class="w-[28px] shrink-0 text-skin-text text-sm" v-text="rank" />

    <div class="flex-1 min-w-[160px]">
      <StakedDelegationAddress
        :address="validator.staker"
        :linked="false"
        :compact="!subtitle"
      >
        <template #badge>
          <UiPill
            v-if="isYours"
            variant="primary"
            class="whitespace-nowrap"
            :class="{ 'lg:hidden': showYourStake }"
          >
            You stake
          </UiPill>
          <UiPill v-if="validator.exiting" class="whitespace-nowrap">
            Exiting
          </UiPill>
          <UiPill
            v-if="config && !config.acceptsDefaultDelegations"
            variant="secondary"
            class="whitespace-nowrap"
          >
            Declined defaults
          </UiPill>
        </template>
        <template v-if="subtitle" #subtitle>
          <div class="text-[15px] text-skin-text truncate" v-text="subtitle" />
        </template>
      </StakedDelegationAddress>
    </div>

    <div class="hidden md:flex w-[96px] shrink-0 flex-col items-end gap-1">
      <span class="text-skin-heading" v-text="_p(share)" />
      <div class="h-1 w-[64px] rounded-full bg-skin-border overflow-hidden">
        <div
          class="h-full bg-skin-link"
          :style="{ width: _p(Math.min(1, share)) }"
        />
      </div>
    </div>

    <div class="w-[88px] sm:w-[96px] shrink-0 text-right leading-[22px]">
      <div class="text-skin-heading">{{ strk(total) }}</div>
      <div class="text-skin-text text-[14px] truncate">
        {{ strk(validator.own) }} self
      </div>
    </div>

    <div
      class="hidden sm:block w-[100px] shrink-0 text-right text-skin-heading"
    >
      {{
        validator.commission !== null ? `${validator.commission / 100}%` : '—'
      }}
    </div>

    <div
      class="hidden lg:flex w-[84px] shrink-0 items-center justify-end gap-1.5"
    >
      <template v-if="uptime !== undefined">
        <span class="text-skin-heading">{{ _p(uptime, 1) }}</span>
        <span class="size-[8px] rounded-full shrink-0" :class="uptimeColor" />
      </template>
      <span v-else class="text-skin-text">—</span>
    </div>

    <div class="hidden xl:flex w-[88px] shrink-0 justify-end">
      <StakedDelegationRecordDots
        :record="record"
        :is-loading="isRecordLoading"
      />
    </div>

    <div
      v-if="showYourStake"
      class="hidden lg:block w-[88px] shrink-0 text-right"
      :class="isYours ? 'text-skin-heading' : 'text-skin-text'"
    >
      {{ isYours ? strk(yourStake!) : '—' }}
    </div>

    <div class="hidden 2xl:flex w-[92px] shrink-0 justify-end" @click.stop>
      <UiButton
        :to="`${explorerUrl}/staking?validator=${validator.staker}`"
        :primary="!isYours"
        class="!h-[36px] !px-3"
      >
        {{ isYours ? 'Manage' : 'Stake' }}
      </UiButton>
    </div>
  </div>
</template>
