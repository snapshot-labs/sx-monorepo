<script setup lang="ts">
import { _n, _p, shorten } from '@/helpers/utils';
import type { User, Space, SpaceMetadataDelegation } from '@/types';
import type { Delegate } from '@/composables/useDelegates';

defineProps<{
  space: Space;
  delegates: { delegation: SpaceMetadataDelegation; delegate: Delegate }[];
  user: User;
}>();
</script>

<template>
  <div
    class="bg-skin-bg border-b sticky top-[112px] lg:top-[113px] z-40 flex w-full font-medium space-x-1"
  >
    <div class="pl-4 w-[60%] flex truncate">Delegation contract</div>
    <div class="hidden md:flex w-[20%] justify-end truncate">Delegators</div>
    <div class="w-[40%] md:w-[20%] flex justify-end pr-4 truncate">Voting power</div>
  </div>
  <div v-for="(delegation, i) in delegates" :key="i" class="border-b flex space-x-1 py-3">
    <div class="flex flex-col w-[60%] leading-[22px] pl-4 truncate">
      <h4 class="text-skin-link truncate" v-text="delegation.delegation.name" />
      <div class="text-[17px truncate" v-text="shorten(delegation.delegate.id)" />
    </div>
    <div class="hidden md:flex w-[20%] flex-col items-end justify-center leading-[22px] truncate">
      <h4 class="text-skin-link" v-text="_n(delegation.delegate.tokenHoldersRepresentedAmount)" />
      <div class="text-[17px]" v-text="_p(delegation.delegate.delegatorsPercentage)" />
    </div>
    <div class="w-[40%] md:w-[20%] flex flex-col items-end pr-4 leading-[22px] truncate">
      <h4 class="text-skin-link" v-text="_n(delegation.delegate.delegatedVotes)" />
      <div class="text-[17px]" v-text="_p(delegation.delegate.votesPercentage)" />
    </div>
  </div>
</template>
