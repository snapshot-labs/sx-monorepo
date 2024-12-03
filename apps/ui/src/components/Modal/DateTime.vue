<script setup lang="ts">
type Step = 'DATE' | 'TIME';

const datetime = defineModel<number>({ required: true });

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const currentStep = ref<Step>('DATE');

function handleClose() {
  currentStep.value = 'DATE';
  emit('close');
}

function handleSubmit() {
  handleClose();
}
</script>

<template>
  <UiModal :open="open" @close="handleClose">
    <template #header>
      <h3 v-text="`Select ${currentStep === 'DATE' ? 'date' : 'time'}`" />
    </template>
    <div v-if="currentStep === 'DATE'">Calendar</div>
    <div v-else-if="currentStep === 'TIME'">TimePicker</div>
    <template #footer>
      <div class="flex space-x-3">
        <UiButton class="w-full" @click="handleClose"> Cancel </UiButton>
        <UiButton
          v-if="currentStep == 'DATE'"
          class="primary w-full"
          @click="currentStep = 'TIME'"
        >
          Next
        </UiButton>
        <UiButton
          v-else-if="currentStep == 'TIME'"
          class="primary w-full"
          @click="handleSubmit"
        >
          Confirm
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
