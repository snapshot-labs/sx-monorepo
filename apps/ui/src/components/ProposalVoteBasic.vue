<script setup lang="ts">
import { Choice } from '@/types';

withDefaults(
  defineProps<{
    size?: number;
    choices: string[];
  }>(),
  { size: 48 }
);

const emit = defineEmits<{
  (e: 'vote', value: Choice): void;
}>();
</script>

<template>
  <div class="flex space-x-2">
    <UiTooltip :title="choices[0]">
      <UiButton
        class="!text-skin-success !border-skin-success"
        uniform
        :size="size"
        @click="emit('vote', 'for')"
      >
        <IH-check />
      </UiButton>
    </UiTooltip>
    <UiTooltip :title="choices[1]">
      <UiButton
        class="!text-skin-danger !border-skin-danger"
        uniform
        :size="size"
        @click="emit('vote', 'against')"
      >
        <IH-x />
      </UiButton>
    </UiTooltip>
    <UiTooltip v-if="choices.length === 3" :title="choices[2]">
      <UiButton
        class="!text-gray-500 !border-gray-500"
        uniform
        :size="size"
        @click="emit('vote', 'abstain')"
      >
        <IH-minus-sm />
      </UiButton>
    </UiTooltip>
  </div>
</template>
