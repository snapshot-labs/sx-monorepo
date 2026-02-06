<script lang="ts" setup>
import { partitionDuration } from '@/helpers/utils';

const props = withDefaults(
  defineProps<{
    timestamp: number;
    startTimestamp?: number;
    inline?: boolean;
  }>(),
  {
    inline: false
  }
);

const currentTimestamp = useTimestamp({ interval: 1000 });

const countdown = computed(() => {
  const currentTimestampSeconds = Math.floor(currentTimestamp.value / 1000);

  if (props.timestamp < currentTimestampSeconds) {
    return null;
  }

  const diff = props.timestamp - currentTimestampSeconds;

  return partitionDuration(diff);
});

const progress = computed(() => {
  if (!props.startTimestamp) return 0;

  const currentTimestampSeconds = Math.floor(currentTimestamp.value / 1000);
  const totalDuration = props.timestamp - props.startTimestamp;
  const elapsed = currentTimestampSeconds - props.startTimestamp;

  if (totalDuration <= 0) return 100;

  const percentage = (elapsed / totalDuration) * 100;
  return Math.min(Math.max(percentage, 0), 100);
});
</script>

<template>
  <div
    v-if="countdown && inline"
    class="relative bg-skin-border overflow-hidden"
  >
    <div
      class="absolute inset-y-0 left-0 bg-rose-500"
      :style="{ width: `${progress}%` }"
    />
    <div class="relative text-rose-500 px-4 py-2 text-center">
      Ending in:
      <template v-if="countdown.days > 0">{{ countdown.days }}d </template>
      {{ countdown.hours }}h {{ countdown.minutes }}m {{ countdown.seconds }}s
    </div>
  </div>
  <div v-else-if="countdown" class="flex gap-3.5">
    <div
      v-if="countdown.days > 0"
      class="flex flex-col items-center uppercase min-w-6"
    >
      <span class="text-[32px] tracking-wider text-rose-500">
        {{ String(countdown.days).padStart(2, '0') }}
      </span>
      <span>days</span>
    </div>
    <div class="flex flex-col items-center uppercase min-w-6">
      <span class="text-[32px] tracking-wider text-rose-500">
        {{ String(countdown.hours).padStart(2, '0') }}
      </span>
      <span>hrs.</span>
    </div>
    <div class="flex flex-col items-center uppercase min-w-6">
      <span class="text-[32px] tracking-wider text-rose-500">
        {{ String(countdown.minutes).padStart(2, '0') }}
      </span>
      <span>min.</span>
    </div>
    <div class="flex flex-col items-center uppercase min-w-6">
      <span class="text-[32px] tracking-wider text-rose-500">
        {{ String(countdown.seconds).padStart(2, '0') }}
      </span>
      <span>sec.</span>
    </div>
  </div>
</template>
