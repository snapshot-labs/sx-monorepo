<script setup lang="ts">
import { TURBO_URL } from '@/helpers/constants';
import { getValidator } from '@/helpers/validation';
import { SkinSettings, Space } from '@/types';

const CUSTOM_DOMAIN_DEFINITION = {
  type: 'string',
  format: 'domain',
  title: 'Domain name',
  maxLength: 64,
  examples: ['vote.balancer.fi']
};

const COLOR_VALIDATION = {
  type: 'string',
  format: 'color',
  examples: ['#FF0000']
};

const SKIN_DEFINITION = {
  type: 'object',
  title: 'Skin settings',
  additionalProperties: false,
  required: [],
  properties: {
    bg_color: {
      ...COLOR_VALIDATION,
      title: 'Background color'
    },
    text_color: {
      ...COLOR_VALIDATION,
      title: 'Text color'
    },
    link_color: {
      ...COLOR_VALIDATION,
      title: 'Link color'
    },
    content_color: {
      ...COLOR_VALIDATION,
      title: 'Content color',
      tooltip: 'Proposal text color'
    },
    border_color: {
      ...COLOR_VALIDATION,
      title: 'Border color'
    },
    heading_color: {
      ...COLOR_VALIDATION,
      title: 'Heading color'
    },
    primary_color: {
      ...COLOR_VALIDATION,
      title: 'Primary color'
    },
    theme: {
      type: 'string',
      title: 'Base theme',
      enum: ['light', 'dark'],
      options: [
        { id: 'light', name: 'Light' },
        { id: 'dark', name: 'Dark' }
      ]
    }
  }
};

const customDomain = defineModel<string>('customDomain', { required: true });
const skinSettings = defineModel<SkinSettings>('skinSettings', {
  required: true
});

const props = defineProps<{
  space: Space;
}>();

const emit = defineEmits<{
  (e: 'errors', value: any);
}>();

const formErrors = computed(() => {
  const validator = getValidator({
    type: 'object',
    title: 'Whitelabel',
    additionalProperties: false,
    required: [],
    properties: {
      customDomain: CUSTOM_DOMAIN_DEFINITION,
      ...SKIN_DEFINITION.properties
    }
  });

  const errors = validator.validate(
    {
      customDomain: customDomain.value,
      ...skinSettings.value
    },
    {
      skipEmptyOptionalFields: true
    }
  );
  return errors;
});

const disabled = computed(() => {
  return !props.space.turbo && !props.space.additionalRawData?.domain;
});

watch(formErrors, value => emit('errors', value));

onMounted(() => {
  emit('errors', formErrors.value);
});
</script>

<template>
  <UiMessage
    v-if="disabled"
    type="info"
    :learn-more-link="TURBO_URL"
    class="mb-4"
  >
    Whitelabel features are only available for Turbo subscribers.
  </UiMessage>
  <div class="s-box space-y-4">
    <div>
      <h4 class="eyebrow mb-2 font-medium">Custom domain</h4>
      <UiMessage
        type="info"
        class="mb-3"
        :learn-more-link="'https://docs.snapshot.box/spaces/add-custom-domain'"
      >
        To set up a custom domain, you need to create a CNAME record pointing to
        "cname.snapshot.box" with your DNS provider or registrar.
      </UiMessage>
      <UiInputString
        v-model="customDomain"
        :definition="CUSTOM_DOMAIN_DEFINITION"
        :error="formErrors.customDomain"
        :disabled="disabled"
      />
    </div>
    <div>
      <h4 class="eyebrow font-medium">Skin colors</h4>
      <div class="mb-2">
        Empty colors value will fallback to the base theme color.
      </div>
      <UiForm
        v-model="skinSettings"
        :definition="SKIN_DEFINITION"
        :error="formErrors"
        :disabled="disabled"
      />
    </div>
    <div>
      <h4 class="eyebrow font-medium">Custom logo</h4>
      <div class="mb-2">
        You can replace your space name in the upper left corner by a custom
        logo. Recommended size is 380x76 pixels.
      </div>
      <UiInputStamp
        v-model="skinSettings.logo"
        :disabled="disabled"
        :fallback="false"
        :width="380"
        :height="76"
        class="!border-0"
        :definition="{
          type: 'string',
          format: 'stamp',
          title: 'Logo'
        }"
      />
    </div>
  </div>
</template>
