<script setup lang="ts">
type Step = 'DATE' | 'TIME';

const props = defineProps<{
  open: boolean;
  min?: number;
  timestamp: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'pick', timestamp: number): void;
}>();

const currentStep = ref<Step>('DATE');
const date = ref(props.timestamp);

function handleClose() {
  currentStep.value = 'DATE';
  emit('close');
}

function handleSubmit() {
  handleClose();
  emit('pick', date.value);
}

function handleDateUpdate(timestamp: number) {
  date.value = timestamp;
  currentStep.value = 'TIME';
}
</script>

<template>
  <UiModal :open="open" @close="handleClose">
    <template #header>
      <h3 v-text="`Select ${currentStep === 'DATE' ? 'date' : 'time'}`" />
    </template>
    <div v-if="currentStep === 'DATE'" class="p-4">
      <UiCalendar :min="min" :selected="timestamp" @pick="handleDateUpdate" />
    </div>
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
