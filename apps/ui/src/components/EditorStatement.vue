<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import type { Statement } from '@/types';

const model = defineModel<Statement>({
  required: true
});

const emit = defineEmits<{
  (e: 'close');
}>();

const actions = useActions();

const sending = ref(false);
const previewEnabled = ref(false);
const form = reactive(clone(model.value));

const definition = computed(() => {
  return {
    type: 'object',
    title: 'Statement',
    additionalProperties: false,
    required: [],
    properties: {
      statement: {
        type: 'string',
        format: 'long',
        title: 'Statement',
        maxLength: 10000
      },
      discourse: {
        type: 'string',
        title: 'Discourse handle',
        maxLength: 30,
        pattern: '^[A-Za-z0-9-_.]*$',
        examples: ['Discourse username']
      },
      status: {
        enum: ['active', 'inactive'],
        title: 'Status'
      }
    }
  };
});

const formErrors = computed(() =>
  validateForm(definition.value, form, { skipEmptyOptionalFields: true })
);

async function handleSubmit() {
  sending.value = true;

  try {
    await actions.updateStatement(form);
    model.value = form;
    emit('close');
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="max-w-[592px] s-box">
    <UiSelect
      v-model="form.status"
      :definition="definition.properties.status"
      :error="formErrors.status"
    />
    <div class="mb-3">
      <div class="flex space-x-3">
        <button type="button" @click="previewEnabled = false">
          <UiLink :is-active="!previewEnabled" text="Write" class="border-transparent" />
        </button>
        <button type="button" @click="previewEnabled = true">
          <UiLink :is-active="previewEnabled" text="Preview" class="border-transparent" />
        </button>
      </div>
      <UiMarkdown
        v-if="previewEnabled"
        class="px-3 py-2 mb-3 border rounded-lg min-h-[200px]"
        :body="form.statement"
      />
      <UiComposer v-else v-model="form.statement" />
    </div>
    <UiInputString
      v-model="form.discourse"
      :definition="definition.properties.discourse"
      :error="formErrors.discourse"
    />
    <div class="flex items-center justify-between space-x-2.5">
      <UiButton class="w-full" @click="$emit('close')">Cancel</UiButton>
      <UiButton
        primary
        class="w-full"
        :disabled="Object.keys(formErrors).length > 0"
        :loading="sending"
        @click="handleSubmit"
      >
        Save
      </UiButton>
    </div>
  </div>
</template>
