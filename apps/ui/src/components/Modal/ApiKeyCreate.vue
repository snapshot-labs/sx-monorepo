<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

const FORM_STATE = {
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
const { copy, copied } = useClipboard();

const step = ref<'form' | 'signing' | 'reveal'>('form');
const form = ref(clone(FORM_STATE));
const apiKey = ref('');

const formValidator = getValidator(DEFINITION);

const formErrors = computed(() =>
  formValidator.validate(form.value, { skipEmptyOptionalFields: true })
);

const canSubmit = computed(
  () =>
    step.value === 'form' &&
    !Object.keys(formErrors.value).length &&
    form.value.name.trim().length > 0
);

async function handleSubmit() {
  if (!canSubmit.value) return;

  try {
    step.value = 'signing';
    apiKey.value = await props.createKey(form.value.name.trim());
    step.value = 'reveal';
  } catch (err) {
    console.error('Failed to create API key', err);
    uiStore.addNotification(
      'error',
      'An error occurred while creating your API key, please try again.'
    );
    step.value = 'form';
  }
}

watch(
  () => props.open,
  open => {
    if (open) return;

    step.value = 'form';
    form.value = clone(FORM_STATE);
    apiKey.value = '';
  }
);
</script>

<template>
  <UiModal :open="open" :closeable="step !== 'signing'" @close="emit('close')">
    <template #header>
      <h3 v-text="step === 'reveal' ? 'Your API key' : 'New API key'" />
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
    <div
      v-else-if="step === 'signing'"
      class="p-4 py-8 flex flex-col items-center gap-3 text-center"
    >
      <UiLoading />
      <h4 class="text-skin-heading">Waiting for signature</h4>
      <div class="text-sm leading-[18px] max-w-[280px]">
        Confirm the signature request in your wallet to create the key.
      </div>
    </div>
    <div v-else class="p-4 space-y-3">
      <div class="flex items-center gap-2 rounded-lg border px-3 py-2.5">
        <span
          class="grow truncate font-mono text-sm text-skin-link"
          v-text="apiKey"
        />
        <UiTooltip :title="copied ? 'Copied' : 'Copy key'">
          <button
            type="button"
            class="text-skin-text shrink-0 flex"
            aria-label="Copy API key"
            @click="copy(apiKey)"
          >
            <IH-duplicate v-if="!copied" class="size-[18px]" />
            <IH-check v-else class="size-[18px] text-skin-success" />
          </button>
        </UiTooltip>
      </div>
      <UiAlert type="error">
        This key is only shown once. Copy it now and store it somewhere safe —
        anyone with this key can use your quota.
      </UiAlert>
    </div>
    <template v-if="step !== 'signing'" #footer>
      <UiButton
        v-if="step === 'form'"
        class="w-full"
        primary
        :disabled="!canSubmit"
        @click="handleSubmit"
      >
        Sign & create key
      </UiButton>
      <UiButton v-else class="w-full" @click="emit('close')">Done</UiButton>
    </template>
  </UiModal>
</template>
