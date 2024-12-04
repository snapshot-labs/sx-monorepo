<script setup lang="ts">
import dayjs from 'dayjs';

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
const date = ref<number>(0);
const time = ref<string>('');
const formError = ref<null | string>(null);

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
  handleNextClick();
}

function handleNextClick() {
  currentStep.value = 'TIME';
  date.value ||= props.timestamp;

  handleTimeUpdate();

  if (formError) {
    time.value = dayjs(new Date()).format('HH:mm');
  }
}

function handleTimeUpdate() {
  time.value ||= dayjs.unix(props.timestamp).format('HH:mm');
  const [hours, minutes] = time.value.split(':');

  date.value = dayjs
    .unix(date.value)
    .set('hour', +hours)
    .set('minute', +minutes)
    .unix();

  validateForm();
}

function validateForm() {
  if (date.value < dayjs.unix(props.min).startOf('minute').unix()) {
    formError.value = 'Date must be in the future';
  } else {
    formError.value = null;
  }
}

watch(time, () => handleTimeUpdate());
</script>

<template>
  <UiModal :open="open" @close="handleClose">
    <template #header>
      <h3 v-text="`Select ${currentStep === 'DATE' ? 'date' : 'time'}`" />
    </template>
    <div v-if="currentStep === 'DATE'" class="p-4">
      <UiCalendar
        :min="min"
        :selected="date || timestamp"
        @pick="handleDateUpdate"
      />
    </div>
    <div
      v-else-if="currentStep === 'TIME'"
      :class="['my-4 text-center', { 's-error': formError }]"
    >
      <input
        v-model="time"
        type="time"
        class="s-input mx-auto max-w-[140px] text-center text-lg"
      />
      <span v-if="formError" class="s-input-error-message" v-text="formError" />
    </div>
    <template #footer>
      <div class="flex space-x-3">
        <UiButton
          v-if="currentStep === 'DATE'"
          class="w-full"
          @click="handleClose"
        >
          Cancel
        </UiButton>
        <UiButton v-else class="w-full" @click="currentStep = 'DATE'">
          Previous
        </UiButton>
        <UiButton
          v-if="currentStep == 'DATE'"
          class="primary w-full"
          @click="handleNextClick"
        >
          Next
        </UiButton>
        <UiButton
          v-else-if="currentStep == 'TIME'"
          class="primary w-full"
          :disabled="!!formError"
          @click="handleSubmit"
        >
          Confirm
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
