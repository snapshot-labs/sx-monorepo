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
      <UiButton
        class="!text-skin-success !border-skin-success !px-0"
        :class="{ '!w-[48px] !h-[48px]': size === 48, '!w-[40px] !h-[40px]': size === 40 }"
        :loading="sendingType === 'for'"
        @click="emit('vote', 'for')"
      >
        <IH-check class="inline-block" />
      </UiButton>
    </UiTooltip>
    <UiTooltip title="Against">
      <UiButton
        class="!text-skin-danger !border-skin-danger !px-0"
        :class="{ '!w-[48px] !h-[48px]': size === 48, '!w-[40px] !h-[40px]': size === 40 }"
        :loading="sendingType === 'against'"
        @click="emit('vote', 'against')"
      >
        <IH-x class="inline-block" />
      </UiButton>
    </UiTooltip>
    <UiTooltip title="Abstain">
      <UiButton
        class="!text-gray-500 !border-gray-500 !px-0"
        :class="{ '!w-[48px] !h-[48px]': size === 48, '!w-[40px] !h-[40px]': size === 40 }"
        :loading="sendingType === 'abstain'"
        @click="emit('vote', 'abstain')"
      >
        <IH-minus-sm class="inline-block" />
      </UiButton>
    </UiTooltip>
  </div>
</template>
