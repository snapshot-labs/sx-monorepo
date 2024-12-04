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
const date = ref(props.timestamp);
const time = ref(dayjs.unix(props.timestamp).format('hh:mm'));

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

watch(time, value => {
  const [hours, minutes] = value.split(':');
  date.value = dayjs
    .unix(date.value)
    .set('hour', +hours)
    .set('minute', +minutes)
    .unix();
});
</script>

<template>
  <UiModal :open="open" @close="handleClose">
    <template #header>
      <h3 v-text="`Select ${currentStep === 'DATE' ? 'date' : 'time'}`" />
    </template>
    <div v-if="currentStep === 'DATE'" class="p-4">
      <UiCalendar :min="min" :selected="timestamp" @pick="handleDateUpdate" />
    </div>
    <div v-else-if="currentStep === 'TIME'" class="my-4">
      <input
        v-model="time"
        type="time"
        class="s-input mx-auto max-w-[140px] text-center text-lg"
      />
    </div>
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
