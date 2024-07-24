<script setup lang="ts">
import { Choice } from '@/types';

withDefaults(
  defineProps<{
    sendingType: Choice | null;
    size?: number;
  }>(),
  { size: 48 }
);

const emit = defineEmits<{
  (e: 'vote', value: Choice);
}>();
</script>

<template>
  <div class="flex space-x-2">
    <UiTooltip title="For">
      <UiButtonRound
        class="!text-skin-success !border-skin-success"
        :size="size"
        :loading="sendingType === 'for'"
        @click="emit('vote', 'for')"
      >
        <IH-check />
      </UiButtonRound>
    </UiTooltip>
    <UiTooltip title="Against">
      <UiButtonRound
        class="!text-skin-danger !border-skin-danger"
        :size="size"
        :loading="sendingType === 'against'"
        @click="emit('vote', 'against')"
      >
        <IH-x />
      </UiButtonRound>
    </UiTooltip>
    <UiTooltip title="Abstain">
      <UiButtonRound
        class="!text-gray-500 !border-gray-500"
        :size="size"
        :loading="sendingType === 'abstain'"
        @click="emit('vote', 'abstain')"
      >
        <IH-minus-sm />
      </UiButtonRound>
    </UiTooltip>
  </div>
</template>
