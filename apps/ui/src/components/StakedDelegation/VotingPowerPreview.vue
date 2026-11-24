<script setup lang="ts">
import {
  isSameAddress,
  Membership,
  resolvePoolMember
} from '@/helpers/stakedVoteDelegation';
import { _c, _p } from '@/helpers/utils';

const props = defineProps<{
  account: string;
  memberships: Membership[];
  /** Delegate to preview: `null` for the default, `undefined` to skip. */
  delegatee: string | null;
  isChanged: boolean;
}>();

// Darkest first; extra voters reuse the lightest shade.
const SHADES = ['opacity-100', 'opacity-70', 'opacity-45', 'opacity-25'];

const total = computed(() =>
  props.memberships.reduce((sum, m) => sum + m.amount, 0n)
);

const voters = computed(() => {
  const byVoter = new Map<string, bigint>();
  for (const m of props.memberships) {
    const { votesWith } = resolvePoolMember(
      props.account,
      m.validator.staker,
      props.delegatee,
      m.config
    );
    const key = votesWith.toLowerCase();
    byVoter.set(key, (byVoter.get(key) ?? 0n) + m.amount);
  }
  return [...byVoter.entries()]
    .map(([address, amount]) => ({
      address,
      amount,
      share:
        total.value > 0n ? Number((amount * 10000n) / total.value) / 10000 : 0
    }))
    .sort((a, b) => (b.amount > a.amount ? 1 : -1));
});

function shade(index: number) {
  return SHADES[Math.min(index, SHADES.length - 1)];
}
</script>

<template>
  <div class="border rounded-lg px-3.5 py-3 flex flex-col gap-2.5">
    <div class="flex items-center justify-between gap-2">
      <UiEyebrow class="text-skin-text">
        {{ isChanged ? 'If you save' : 'Right now' }}: who votes with your stake
      </UiEyebrow>
      <span class="text-skin-text text-sm whitespace-nowrap">
        {{ _c(total) }} STRK
      </span>
    </div>
    <div class="flex h-2 w-full rounded-full overflow-hidden gap-0.5">
      <div
        v-for="(voter, i) in voters"
        :key="voter.address"
        class="h-full bg-skin-link transition-all"
        :class="shade(i)"
        :style="{ width: _p(voter.share) }"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <div
        v-for="(voter, i) in voters"
        :key="voter.address"
        class="flex items-center gap-2.5 text-[16px]"
      >
        <span
          class="size-[10px] rounded-full bg-skin-link shrink-0"
          :class="shade(i)"
        />
        <StakedDelegationAddress
          :address="voter.address"
          :size="20"
          :linked="false"
          :label="isSameAddress(voter.address, account) ? 'You' : undefined"
          compact
          class="flex-1"
        />
        <span class="text-skin-heading whitespace-nowrap">
          {{ _c(voter.amount) }}
        </span>
        <span class="text-skin-text text-sm w-[52px] text-right">
          {{ _p(voter.share) }}
        </span>
      </div>
    </div>
  </div>
</template>
