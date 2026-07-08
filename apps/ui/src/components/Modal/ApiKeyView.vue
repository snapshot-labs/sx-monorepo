<script setup lang="ts">
import { ApiKey } from '@/helpers/keycard/types';

defineProps<{
  open: boolean;
  apiKey: ApiKey | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>API key</h3>
    </template>
    <div class="p-4 space-y-3">
      <ApiKeyField v-if="apiKey" :value="apiKey.key" />
      <div class="text-sm leading-[18px]">
        Keep this key secret, anyone with it can use your credit.
      </div>
    </div>
    <template #footer>
      <UiButton class="w-full" @click="emit('close')">Done</UiButton>
    </template>
  </UiModal>
</template>
