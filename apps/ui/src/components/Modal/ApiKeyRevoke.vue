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

const step = ref<'confirm' | 'signing'>('confirm');

async function handleRevokeClick() {
  if (!props.apiKey) return;

  try {
    step.value = 'signing';
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
    step.value = 'confirm';
  }
}

watch(
  () => props.open,
  open => {
    if (open) return;

    step.value = 'confirm';
  }
);
</script>

<template>
  <UiModal :open="open" :closeable="step !== 'signing'" @close="emit('close')">
    <template #header>
      <h3>Revoke API key</h3>
    </template>
    <div v-if="step === 'confirm'" class="p-4">
      Are you sure you want to revoke
      <span class="text-skin-heading" v-text="apiKey?.name" />? Requests made
      with this key will stop working immediately. This cannot be undone.
    </div>
    <div v-else class="p-4 py-8 flex flex-col items-center gap-3 text-center">
      <UiLoading />
      <h4 class="text-skin-heading">Waiting for signature</h4>
      <div class="text-sm leading-[18px] max-w-[280px]">
        Confirm the signature request in your wallet to revoke the key.
      </div>
    </div>
    <template v-if="step === 'confirm'" #footer>
      <UiButton
        class="w-full !text-skin-danger !border-skin-danger"
        @click="handleRevokeClick"
      >
        Sign & revoke key
      </UiButton>
    </template>
  </UiModal>
</template>
