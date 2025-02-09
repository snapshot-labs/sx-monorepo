<script lang="ts" setup>
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

const VALID_EXTENSIONS = [
  'eth',
  'xyz',
  'com',
  'org',
  'io',
  'app',
  'art',
  'id'
] as const;

const DOMAIN_DEFINITION = {
  type: 'string',
  pattern: `^[a-zA-Z0-9\\-\\.]+\\.(${VALID_EXTENSIONS.join('|')})$`,
  title: 'ENS name',
  examples: ['dao-name.eth'],
  errorMessage: {
    pattern: `Must be a valid domain ending with ${VALID_EXTENSIONS.join(', ')}`
  }
} as const;

const definition = {
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    domain: DOMAIN_DEFINITION
  }
};

const emit = defineEmits<{
  (e: 'submit');
}>();

const form = ref(clone({ domain: '' }));

const formErrors = computed(() => {
  const validator = getValidator(definition);
  return validator.validate(form.value, { skipEmptyOptionalFields: true });
});

const formValid = computed(() => {
  return form.value.domain && Object.keys(formErrors.value).length === 0;
});
</script>

<template>
  <div class="s-box">
    <UiForm :model-value="form" :error="formErrors" :definition="definition" />
    <UiButton
      class="w-full"
      :disabled="!formValid"
      :to="
        formValid
          ? `https://app.ens.domains/name/${form.domain}/register`
          : undefined
      "
      @click="emit('submit')"
    >
      Register ENS name
    </UiButton>
  </div>
</template>
