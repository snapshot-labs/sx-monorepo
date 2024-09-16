<script setup lang="ts">
import { VOTING_TYPES_INFO } from '@/helpers/constants';
import { VoteType } from '@/types';

defineProps<{
  open: boolean;
  initialState?: VoteType;
  votingTypes: VoteType[];
}>();

const emit = defineEmits<{
  (e: 'save', type: VoteType);
  (e: 'close');
}>();

function handleSelect(type: VoteType) {
  emit('save', type);
  emit('close');
}
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Select voting system</h3>
    </template>
    <div class="p-4 flex flex-col gap-2.5">
      <UiSelector
        v-for="(type, index) in votingTypes"
        :key="index"
        :is-active="initialState === type"
        @click="handleSelect(type)"
      >
        <div>
          <h4 class="text-skin-link" v-text="VOTING_TYPES_INFO[type].label" />
          <div v-text="VOTING_TYPES_INFO[type].description" />
        </div>
      </UiSelector>
    </div>
  </UiModal>
</template>
