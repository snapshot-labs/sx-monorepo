<script setup lang="ts">
import { VALIDATION_TYPES_INFO } from '@/helpers/constants';
import { getValidator } from '@/helpers/validation';
import { Validation } from '@/types';

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

const proposalValidation = defineModel<Validation>('proposalValidation', {
  required: true
});
const onlyMembers = defineModel<boolean>('onlyMembers', {
  required: true
});
const guidelines = defineModel<string>('guidelines', {
  required: true
});
const template = defineModel<string>('template', {
  required: true
});

defineProps<{
  isProposalValidationValid: boolean;
}>();

const emit = defineEmits<{
  (e: 'updateValidity', valid: boolean): void;
}>();

const isSelectValidationModalOpen = ref(false);

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
    <UiWrapperInput
      :definition="{
        title: 'Validation',
        tooltip:
          'The type of validation used to determine if a user can create a proposal. (Enforced on all future proposals)'
      }"
    >
      <button
        :disabled="onlyMembers"
        type="button"
        class="s-input !flex flex-row justify-between items-center"
        :class="{
          'opacity-50 cursor-not-allowed': onlyMembers
        }"
        @click="isSelectValidationModalOpen = true"
      >
        <div>
          {{
            VALIDATION_TYPES_INFO[
              proposalValidation.name === 'any'
                ? 'any-proposal'
                : proposalValidation.name
            ].label
          }}
        </div>
        <IH-chevron-down />
      </button>
    </UiWrapperInput>
    <UiSwitch
      v-model="onlyMembers"
      title="Allow only authors to submit a proposal"
    />
    <UiMessage v-if="!isProposalValidationValid" type="danger" class="mt-3">
      Proposal validation is required to prevent unauthorized proposals and
      spam. If you don't want proposal validation you can toggle only the "Allow
      only authors to submit a proposal" option.
    </UiMessage>
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
  <teleport to="#modal">
    <ModalSelectValidation
      type="proposal"
      :open="isSelectValidationModalOpen"
      :current="proposalValidation"
      @close="isSelectValidationModalOpen = false"
      @save="value => (proposalValidation = value)"
    />
  </teleport>
</template>
