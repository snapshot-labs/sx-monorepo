<script setup lang="ts">
import dayjs from 'dayjs';

const TIME_FORMAT = 'HH:mm';

const STEPS = {
  date: { id: 'date', title: 'Select date' },
  time: { id: 'time', title: 'Select time' }
};

const props = defineProps<{
  open: boolean;
  min?: number;
  selected: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'pick', timestamp: number): void;
}>();

const { current, isCurrent, goTo, goToNext, goToPrevious, isFirst, isLast } =
  useStepper(STEPS);
const date = ref<number>(props.selected);
const time = ref<string>(getBaseTime(props.selected));
const formError = ref<null | string>(null);

function handleClose() {
  emit('close');
}

function handleSubmit() {
  handleClose();
  emit('pick', date.value);
}

function handleDateUpdate(ts: number) {
  date.value = ts;
  time.value = getBaseTime(ts);
  goToNext();
}

function getBaseTime(ts: number): string {
  const originalDate = dayjs.unix(props.selected);
  const selectedDate = dayjs
    .unix(ts)
    .set('hour', originalDate.get('hour'))
    .set('minute', originalDate.get('minute'));

  if (props.min) {
    const minDate = dayjs.unix(props.min);

    if (selectedDate.isBefore(minDate, 'minute')) {
      return minDate.format(TIME_FORMAT);
    }
  }

  return selectedDate.format(TIME_FORMAT);
}

function updateDateWithTime() {
  const [hours, minutes] = time.value.split(':');

  date.value = dayjs
    .unix(date.value)
    .set('hour', +hours)
    .set('minute', +minutes)
    .startOf('minute')
    .unix();
}

function validateForm() {
  if (!props.min) return;

  const minDate = dayjs.unix(props.min).startOf('minute');

  if (date.value < minDate.unix()) {
    formError.value = `Time must be equal or greater than ${minDate.format(TIME_FORMAT)}`;
    return;
  }

  formError.value = null;
}

watch([() => current.value.id, time], ([stepId]) => {
  if (stepId !== 'time') return;

  updateDateWithTime();
  validateForm();
});

watch(
  () => props.open,
  open => {
    if (open) {
      goTo('date');
      date.value = props.selected;
      time.value = getBaseTime(props.selected);
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="handleClose">
    <template #header>
      <h3 v-text="current.title" />
    </template>
    <div :class="['!m-4 text-center', { 's-error': formError }]">
      <UiCalendar
        v-if="isCurrent('date')"
        :min="min"
        :selected="date"
        @pick="handleDateUpdate"
      />
      <template v-else-if="isCurrent('time')">
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
        <UiButton v-if="isFirst" class="w-full" @click="handleClose">
          Cancel
        </UiButton>
        <UiButton v-else class="w-full" @click="goToPrevious">
          Previous
        </UiButton>
        <UiButton v-if="!isLast" class="primary w-full" @click="goToNext">
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
