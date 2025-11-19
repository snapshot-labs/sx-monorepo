<script setup lang="ts">
import { VotingPowerItem } from '@/queries/votingPower';
import { NetworkID } from '@/types';

defineProps<{
  open: boolean;
  networkId: NetworkID;
  isLoading: boolean;
  isError: boolean;
  votingPower?: VotingPowerItem;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'fetch'): void;
}>();
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Your voting power</h3>
    </template>
    <UiLoading v-if="isLoading" class="p-4 block text-center" />
    <MessageErrorFetchPower
      v-else-if="isError"
      type="voting"
      class="p-4"
      @fetch="emit('fetch')"
    />
    <VotingPowerList
      v-else-if="votingPower"
      :voting-power="votingPower"
      :network-id="networkId"
    />
  </UiModal>
</template>
