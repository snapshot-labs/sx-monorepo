<script setup lang="ts">
import { ApiKey } from '@/helpers/keycard/types';
import { validateForm } from '@/helpers/validation';

const DEFINITION = {
  type: 'object',
  title: 'API key',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      minLength: 1,
      maxLength: 32,
      examples: ['My app']
    }
  }
};

const props = defineProps<{
  open: boolean;
  apiKey?: ApiKey | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { createKey, isCreating, renameKey, isRenaming } = useApiKeys();

const form = reactive({ name: '' });
const createdKey = ref<ApiKey | null>(null);

const formErrors = computed(() => validateForm(DEFINITION, form));

function handleSubmit() {
  if (props.apiKey) {
    return renameKey(
      { key: props.apiKey.key, name: form.name },
      { onSuccess: () => emit('close') }
    );
  }

  createKey(
    { name: form.name },
    { onSuccess: key => (createdKey.value = key) }
  );
}

watch(
  () => props.open,
  () => {
    form.name = props.apiKey?.name ?? '';
    createdKey.value = null;
  }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3
        v-text="
          createdKey ? 'API key created' : apiKey ? 'Rename key' : 'New key'
        "
      />
    </template>
    <div class="s-box p-4">
      <ApiKeyField v-if="createdKey" :value="createdKey.key" />
      <UiForm
        v-else
        :model-value="form"
        :error="formErrors"
        :definition="DEFINITION"
      />
    </div>
    <template #footer>
      <UiButton v-if="createdKey" class="w-full" @click="emit('close')">
        Done
      </UiButton>
      <UiButton
        v-else
        primary
        class="w-full"
        :loading="isCreating || isRenaming"
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        {{ apiKey ? 'Save' : 'Create' }}
      </UiButton>
    </template>
  </UiModal>
</template>
