<script setup lang="ts">
import { createApiKey } from '@/helpers/keycard';
import { useUiStore } from '@/stores/ui';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', apiKey: { name: string; key: string; created: number }): void;
}>();

const { web3Account } = useWeb3();
const uiStore = useUiStore();
const { copy, copied } = useClipboard();

const name = ref('');
const loading = ref(false);
const generatedKey = ref('');

const isValid = computed(
  () => name.value.length > 0 && name.value.length <= 32
);

async function handleCreate() {
  if (!isValid.value || !web3Account.value) return;

  loading.value = true;
  try {
    const result = await createApiKey({
      name: name.value,
      address: web3Account.value
    });
    generatedKey.value = result.key;
    emit('created', {
      name: name.value,
      key: result.key,
      created: Math.floor(Date.now() / 1000)
    });
  } catch (err: any) {
    uiStore.addNotification(
      'error',
      err?.message || 'Failed to create API key.'
    );
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  () => {
    name.value = '';
    generatedKey.value = '';
  }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Create key</h3>
    </template>
    <div class="s-box p-4 space-y-3">
      <template v-if="!generatedKey">
        <div class="s-base">
          <label class="s-label">Name</label>
          <input
            v-model.trim="name"
            type="text"
            class="s-input w-full"
            placeholder="My app"
            maxlength="32"
          />
        </div>
      </template>
      <template v-else>
        <div
          class="p-3 rounded-lg border border-skin-border bg-skin-bg text-sm break-all font-mono"
        >
          {{ generatedKey }}
        </div>
        <p class="text-skin-text text-sm">
          Copy your API key now. You will not be able to see it again.
        </p>
        <UiButton class="w-full" @click="copy(generatedKey)">
          {{ copied ? 'Copied!' : 'Copy to clipboard' }}
        </UiButton>
      </template>
    </div>
    <template v-if="!generatedKey" #footer>
      <UiButton
        primary
        class="w-full"
        :loading="loading"
        :disabled="!isValid"
        @click="handleCreate"
      >
        Create
      </UiButton>
    </template>
  </UiModal>
</template>
