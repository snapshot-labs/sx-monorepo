<script lang="ts" setup>
import { partitionDuration } from '@/helpers/utils';

const props = defineProps<{
  timestamp: number;
}>();

const currentTimestamp = useTimestamp({ interval: 1000 });

const countdown = computed(() => {
  const currentTimestampSeconds = Math.floor(currentTimestamp.value / 1000);

  if (props.timestamp < currentTimestampSeconds) {
    return null;
  }

  const diff = props.timestamp - currentTimestampSeconds;

  return partitionDuration(diff);
});
</script>

<template>
  <div v-if="countdown" class="flex gap-3.5">
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
