<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { Statement } from '@/types';

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
const formErrors = ref({} as Record<string, any>);
const formValidated = ref(false);

const STATUS_DEFINITION = {
  enum: ['ACTIVE', 'INACTIVE'],
  options: [
    { id: 'ACTIVE', name: 'Active' },
    { id: 'INACTIVE', name: 'Inactive' }
  ],
  title: 'Status'
};

const formValidator = getValidator({
  $async: true,
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
    status: STATUS_DEFINITION
  }
});

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

watchEffect(() => {
  formValidated.value = false;

  formErrors.value = formValidator.validate({
    statement: form.statement,
    status: form.status
  });
  formValidated.value = true;
});
</script>

<template>
  <div class="max-w-[592px] s-box">
    <UiSelect
      v-model="form.status"
      :definition="STATUS_DEFINITION"
      :error="formErrors.status"
    />
    <div class="mb-3">
      <div class="flex space-x-3">
        <button type="button" @click="previewEnabled = false">
          <UiLink
            :is-active="!previewEnabled"
            text="Write"
            class="border-transparent"
          />
        </button>
        <button type="button" @click="previewEnabled = true">
          <UiLink
            :is-active="previewEnabled"
            text="Preview"
            class="border-transparent"
          />
        </button>
      </div>
      <UiMarkdown
        v-if="previewEnabled"
        class="px-3 py-2 mb-3 border rounded-lg min-h-[200px]"
        :body="form.statement"
      />
      <UiComposer v-else v-model="form.statement" />
    </div>
    <div class="flex items-center justify-between space-x-2.5">
      <UiButton class="w-full" @click="$emit('close')">Cancel</UiButton>
      <UiButton
        primary
        class="w-full"
        :disabled="!formValidated || Object.keys(formErrors).length > 0"
        :loading="sending"
        @click="handleSubmit"
      >
        Save
      </UiButton>
    </div>
  </div>
</template>
