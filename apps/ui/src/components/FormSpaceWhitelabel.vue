<script setup lang="ts">
import { getValidator } from '@/helpers/validation';
import { Space } from '@/types';

const CUSTOM_DOMAIN_DEFINITION = {
  type: 'string',
  format: 'domain',
  title: 'Domain name',
  maxLength: 64,
  examples: ['vote.balancer.fi']
};

const customDomain = defineModel<string>('customDomain', { required: true });

defineProps<{
  space: Space;
}>();

const formErrors = computed(() => {
  const validator = getValidator({
    type: 'object',
    title: 'White Label',
    additionalProperties: false,
    required: [],
    properties: {
      customDomain: CUSTOM_DOMAIN_DEFINITION
    }
  });

  const errors = validator.validate(
    {
      customDomain: customDomain.value
    },
    {
      skipEmptyOptionalFields: true
    }
  );
  return errors;
});
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium mt-4">Custom domain</h4>
  <UiMessage
    type="info"
    :learn-more-link="'https://docs.snapshot.box/spaces/add-custom-domain'"
  >
    To set up a custom domain, you must subscribe to the Turbo plan and create a
    CNAME record pointing to "cname.snapshot.box" with your DNS provider or
    registrar.
  </UiMessage>
  <div class="s-box mt-3">
    <UiInputString
      v-model="customDomain"
      :definition="CUSTOM_DOMAIN_DEFINITION"
      :error="formErrors.customDomain"
      :disabled="!space.turbo && !space.additionalRawData?.domain"
    />
  </div>
</template>
