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
  (e: 'vote', value: Choice);
}>();
</script>

<template>
  <div class="flex space-x-2">
    <UiTooltip :title="choices[0]">
      <UiButton
        class="!text-skin-success !border-skin-success !px-0"
        :class="{
          '!size-[48px]': size === 48,
          '!size-[40px]': size === 40
        }"
        @click="emit('vote', 'for')"
      >
        <IH-check class="inline-block" />
      </UiButton>
    </UiTooltip>
    <UiTooltip :title="choices[1]">
      <UiButton
        class="!text-skin-danger !border-skin-danger !px-0"
        :class="{
          '!size-[48px]': size === 48,
          '!size-[40px]': size === 40
        }"
        @click="emit('vote', 'against')"
      >
        <IH-x class="inline-block" />
      </UiButton>
    </UiTooltip>
    <UiTooltip :title="choices[2]">
      <UiButton
        class="!text-gray-500 !border-gray-500 !px-0"
        :class="{
          '!size-[48px]': size === 48,
          '!size-[40px]': size === 40
        }"
        @click="emit('vote', 'abstain')"
      >
        <IH-minus-sm class="inline-block" />
      </UiButton>
    </UiTooltip>
  </div>
</template>
