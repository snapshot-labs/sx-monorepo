<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

const DEFAULT_FORM_STATE = {
  name: ''
};

const DEFINITION = {
  type: 'object',
  title: 'API key',
  additionalProperties: false,
  required: [],
  properties: {
    name: {
      type: 'string',
      title: 'Key name',
      maxLength: 32,
      examples: ['e.g. Production server']
    }
  }
};

const props = defineProps<{
  open: boolean;
  createKey: (name: string) => Promise<string>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const uiStore = useUiStore();

const step = ref<'form' | 'success'>('form');
const isCreating = ref(false);
const form = ref(clone(DEFAULT_FORM_STATE));
const apiKey = ref('');

const formValidator = getValidator(DEFINITION);

const formErrors = computed(() =>
  formValidator.validate(form.value, { skipEmptyOptionalFields: true })
);

const canSubmit = computed(
  () =>
    !Object.keys(formErrors.value).length && form.value.name.trim().length > 0
);

async function handleSubmit() {
  if (!canSubmit.value || isCreating.value) return;

  try {
    isCreating.value = true;
    apiKey.value = await props.createKey(form.value.name.trim());
    step.value = 'success';
  } catch (err) {
    console.error('Failed to create API key', err);
    uiStore.addNotification(
      'error',
      'An error occurred while creating your API key, please try again.'
    );
  } finally {
    isCreating.value = false;
  }
}

watch(
  () => props.open,
  open => {
    if (open) return;

    step.value = 'form';
    isCreating.value = false;
    form.value = clone(DEFAULT_FORM_STATE);
    apiKey.value = '';
  }
);
</script>

<template>
  <UiModal :open="open" :closeable="!isCreating" @close="emit('close')">
    <template #header>
      <h3 v-text="step === 'success' ? 'Your API key' : 'New API key'" />
    </template>
    <div v-if="step === 'form'" class="s-box p-4">
      <UiInputString
        v-model="form.name"
        :definition="DEFINITION.properties.name"
        :error="formErrors.name"
        @keyup.enter="handleSubmit"
      />
      <div class="text-sm leading-[18px] px-1">
        A name helps you recognize where this key is used.
      </div>
    </div>
    <div v-else class="p-4 space-y-3">
      <ApiKeyField :value="apiKey" />
      <div class="text-sm leading-[18px]">
        You can copy this key any time from your keys list.
      </div>
    </div>
    <template #footer>
      <UiButton
        v-if="step === 'form'"
        class="w-full"
        primary
        :disabled="!canSubmit"
        :loading="isCreating"
        @click="handleSubmit"
      >
        Create key
      </UiButton>
      <UiButton v-else class="w-full" @click="emit('close')">Done</UiButton>
    </template>
  </UiModal>
</template>
