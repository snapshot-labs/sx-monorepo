<script setup lang="ts">
import { ApiKey } from '@/helpers/keycard/types';

const props = defineProps<{
  open: boolean;
  apiKey: ApiKey | null;
  revokeKey: (id: string) => Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const uiStore = useUiStore();

const isRevoking = ref(false);

async function handleRevokeClick() {
  if (!props.apiKey || isRevoking.value) return;

  try {
    isRevoking.value = true;
    await props.revokeKey(props.apiKey.id);
    uiStore.addNotification(
      'success',
      `API key "${props.apiKey.name}" was revoked`
    );
    emit('close');
  } catch (err) {
    console.error('Failed to revoke API key', err);
    uiStore.addNotification(
      'error',
      'An error occurred while revoking your API key, please try again.'
    );
  } finally {
    isRevoking.value = false;
  }
}

watch(
  () => props.open,
  open => {
    if (!open) isRevoking.value = false;
  }
);
</script>

<template>
  <UiModal :open="open" :closeable="!isRevoking" @close="emit('close')">
    <template #header>
      <h3>Revoke API key</h3>
    </template>
    <div class="p-4">
      Are you sure you want to revoke
      <span class="text-skin-heading" v-text="apiKey?.name" />? Requests made
      with this key will stop working immediately. This cannot be undone.
    </div>
    <template #footer>
      <UiButton
        class="w-full !text-skin-danger !border-skin-danger"
        :loading="isRevoking"
        @click="handleRevokeClick"
      >
        Revoke key
      </UiButton>
    </template>
  </UiModal>
</template>
