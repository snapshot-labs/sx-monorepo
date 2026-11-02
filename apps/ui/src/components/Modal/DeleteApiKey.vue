<script setup lang="ts">
import { ApiKey } from '@/helpers/keycard/types';

const props = defineProps<{
  open: boolean;
  apiKey: ApiKey | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { deleteKey, isDeleting } = useApiKeys();

function handleSubmit() {
  if (!props.apiKey) return;

  deleteKey({ key: props.apiKey.key }, { onSuccess: () => emit('close') });
}
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Delete key</h3>
    </template>
    <div class="s-box p-4">
      <UiMessage type="danger">
        Do you really want to delete {{ apiKey?.name }}? Apps using this key
        will lose access to the Snapshot APIs. This action cannot be undone.
      </UiMessage>
    </div>
    <template #footer>
      <UiButton class="w-full" :loading="isDeleting" @click="handleSubmit">
        Delete key
      </UiButton>
    </template>
  </UiModal>
</template>
