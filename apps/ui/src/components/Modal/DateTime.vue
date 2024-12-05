<script setup lang="ts">
import dayjs from 'dayjs';
import { clone } from '@/helpers/utils';

type Step = 'DATE' | 'TIME';

const DEFAULT_TIME = '';
const TIME_FORMAT = 'HH:mm';

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
const date = ref<number>(props.timestamp);
const time = ref<string>(clone(DEFAULT_TIME));
const formError = ref<null | string>(null);

function handleClose() {
  emit('close');
}

function handleSubmit() {
  handleClose();
  emit('pick', date.value);
}

function handleDateUpdate(timestamp: number) {
  date.value = timestamp;
  moveToNextStep();
}

function moveToNextStep() {
  currentStep.value = 'TIME';

  const originalDate = dayjs.unix(props.timestamp);
  const selectedDate = dayjs
    .unix(date.value)
    .set('hour', originalDate.get('hour'))
    .set('minute', originalDate.get('minute'));

  if (props.min) {
    const minDate = dayjs.unix(props.min);

    if (selectedDate.isBefore(minDate)) {
      time.value = minDate.format(TIME_FORMAT);
      return;
    }
  }

  time.value = selectedDate.format(TIME_FORMAT);
}

function handleTimeUpdate() {
  const [hours, minutes] = time.value.split(':');

  date.value = dayjs
    .unix(date.value)
    .set('hour', +hours)
    .set('minute', +minutes)
    .unix();
}

function validateForm() {
  if (!props.min) return;

  const minDate = dayjs.unix(props.min).startOf('minute');

  if (date.value < minDate.unix()) {
    formError.value = `Time must be greater than ${minDate.format(TIME_FORMAT)}`;
    return;
  }

  formError.value = null;
}

watch(time, () => {
  if (currentStep.value !== 'TIME') return;

  handleTimeUpdate();
  validateForm();
});

watch(
  () => props.open,
  open => {
    if (open) {
      currentStep.value = 'DATE';
      date.value = props.timestamp;
      time.value = DEFAULT_TIME;
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="handleClose">
    <template #header>
      <h3 v-text="`Select ${currentStep === 'DATE' ? 'date' : 'time'}`" />
    </template>
    <div :class="['!m-4 text-center', { 's-error': formError }]">
      <UiCalendar
        v-if="currentStep === 'DATE'"
        :min="min"
        :selected="date"
        @pick="handleDateUpdate"
      />
      <template v-else>
        <input
          v-model="time"
          type="time"
          class="s-input mx-auto max-w-[140px] text-center text-lg"
        />
        <span
          v-if="formError"
          class="s-input-error-message"
          v-text="formError"
        />
      </template>
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
          @click="moveToNextStep"
        >
          Next
        </UiButton>
        <UiButton
          v-else
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
