<script setup lang="ts">
import { PRIVACY_TYPES_INFO } from '@/helpers/constants';
import { SpacePrivacy } from '@/types';

const votingTypes: SpacePrivacy[] = ['any', 'shutter', 'none'];

defineProps<{
  open: boolean;
  initialState?: SpacePrivacy;
}>();

const emit = defineEmits<{
  (e: 'save', type: SpacePrivacy): void;
  (e: 'close'): void;
}>();

function handleSelect(type: SpacePrivacy) {
  emit('save', type);
  emit('close');
}
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Select privacy</h3>
    </template>
    <div class="p-4 flex flex-col gap-2.5">
      <UiSelector
        v-for="type in votingTypes"
        :key="type"
        :is-active="initialState === type"
        @click="handleSelect(type)"
      >
        <div>
          <h4 class="text-skin-link" v-text="PRIVACY_TYPES_INFO[type].label" />
          <div
            v-if="PRIVACY_TYPES_INFO[type].description"
            v-text="PRIVACY_TYPES_INFO[type].description"
          />
        </div>
      </UiSelector>
    </div>
  </UiModal>
</template>
