<script setup lang="ts">
import { getValidator } from '@/helpers/validation';

const GUIDELINES_DEFINITION = {
  type: 'string',
  format: 'uri',
  title: 'Guidelines',
  maxLength: 256,
  examples: ['https://example.com/guidelines'],
  tooltip:
    'Display a link to your guidelines on proposal creation to help users understand what constitutes a good/valid proposal'
};

const TEMPLATE_DEFINITION = {
  type: 'string',
  title: 'Template',
  maxLength: 1024,
  examples: ['## Intro\n## Body\n## Conclusion'],
  tooltip:
    'Start every proposal with a template to help users understand what information is required'
};

const onlyMembers = defineModel<boolean>('onlyMembers', {
  required: true
});
const guidelines = defineModel<string>('guidelines', {
  required: true
});
const template = defineModel<string>('template', {
  required: true
});

const emit = defineEmits<{
  (e: 'updateValidity', valid: boolean): void;
}>();

const errors = computed(() => {
  const validator = getValidator({
    type: 'object',
    title: 'Proposal',
    additionalProperties: false,
    required: [],
    properties: {
      guidelines: GUIDELINES_DEFINITION,
      template: TEMPLATE_DEFINITION
    }
  });

  return validator.validate(
    {
      guidelines: guidelines.value,
      template: template.value
    },
    { skipEmptyOptionalFields: true }
  );
});

watchEffect(() => {
  emit('updateValidity', Object.values(errors.value).length === 0);
});
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium">Proposal Validation</h4>
  <div class="s-box mb-4">
    <UiSwitch
      v-model="onlyMembers"
      title="Allow only authors to submit a proposal"
    />
  </div>
  <h4 class="eyebrow mb-2 font-medium">Proposal</h4>
  <div class="s-box mb-4">
    <UiInputString
      v-model="guidelines"
      :definition="GUIDELINES_DEFINITION"
      :error="errors.guidelines"
    />
    <UiTextarea
      v-model="template"
      :definition="TEMPLATE_DEFINITION"
      :error="errors.template"
      class="!min-h-[140px]"
    />
  </div>
</template>
