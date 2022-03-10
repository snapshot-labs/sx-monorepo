<script setup>
import { _rt, _n, shortenAddress } from '@/helpers/utils';

defineProps({
  proposal: Object
});
</script>
<template>
  <router-link
    :to="{ name: 'proposal', params: { id: proposal.id, space: 'bolo' } }"
    class="x-block"
  >
    <div class="p-4">
      <div class="overflow-hidden mb-3">
        <Icon name="threedots" size="20" class="float-right" />
        <Stamp
          id="0xeF8305E140ac520225DAf050e2f71d5fBcC543e7"
          :size="24"
          class="float-left mr-2"
        />
        <span>
          {{ shortenAddress(proposal.author) }}
          <span class="text-skin-text">· {{ _rt(proposal.created) }}</span>
        </span>
      </div>
      <h2 class="mb-3">
        {{ proposal.title || `Proposal #${proposal.id.slice(0, 7)}` }}
      </h2>
      <div class="space-x-2 mb-3">
        <UiButton
          @click="vote(1)"
          class="w-full !text-green !border-green w-[46px] !px-0"
        >
          <Icon name="check3" size="20" />
        </UiButton>
        <UiButton
          @click="vote(2)"
          class="w-full !text-red !border-red w-[46px] !px-0"
        >
          <Icon name="close2" size="20" />
        </UiButton>
        <UiButton
          @click="vote(3)"
          class="w-full !text-gray-500 !border-gray-500 w-[46px] !px-0"
        >
          <Icon name="skip" size="20" />
        </UiButton>
      </div>
      <div class="text-skin-text">
        {{ _n(proposal.vote_count) }} votes · {{ _rt(proposal.end) }}
      </div>
    </div>
  </router-link>
</template>
