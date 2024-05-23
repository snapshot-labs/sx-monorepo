<script setup lang="ts">
import { VOTING_TYPES_INFO } from '@/helpers/constants';
import { VoteType } from '@/types';

const props = defineProps<{
  open: boolean;
  initialState?: VoteType;
  votingTypes: VoteType[];
}>();

const emit = defineEmits<{
  (e: 'save', type: VoteType);
  (e: 'close');
}>();

const currentValue = ref<VoteType | null>(null);

function handleSubmit() {
  if (currentValue.value !== null) {
    emit('save', currentValue.value);
  }

  emit('close');
}

watch(
  () => props.open,
  () => {
    if (props.open && props.initialState) {
      currentValue.value = props.initialState;
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Select voting type</h3>
    </template>
    <div class="p-4 flex flex-col gap-[12px]">
      <UiSelector
        v-for="(type, index) in votingTypes"
        :key="index"
        :is-active="currentValue === type"
        @click="currentValue = type"
      >
        <div>
          <h4 class="text-skin-link" v-text="VOTING_TYPES_INFO[type].label" />
          <div v-text="VOTING_TYPES_INFO[type].description" />
        </div>
      </UiSelector>
    </div>
    <template #footer>
      <UiButton class="w-full" @click="handleSubmit">Confirm</UiButton>
    </template>
  </UiModal>
</template>
