<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import { validateForm } from '@/helpers/validation';
import { enabledNetworks } from '@/networks';

const props = withDefaults(
  defineProps<{
    showTitle?: boolean;
    form: any;
  }>(),
  {
    showTitle: true
  }
);

const emit = defineEmits<{
  (e: 'errors', value: any);
  (e: 'pick', field: any);
}>();

const definition = {
  type: 'object',
  title: 'Space',
  additionalProperties: false,
  required: ['name', 'walletNetwork', 'walletAddress'],
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      minLength: 1,
      examples: ['Space name']
    },
    description: {
      type: 'string',
      format: 'long',
      title: 'About',
      examples: ['Space description']
    },
    externalUrl: {
      type: 'string',
      title: 'Website',
      examples: ['Website URL']
    },
    github: {
      type: 'string',
      title: 'GitHub',
      examples: ['GitHub handle']
    },
    twitter: {
      type: 'string',
      title: 'Twitter',
      examples: ['Twitter handle']
    },
    discord: {
      type: 'string',
      title: 'Discord',
      examples: ['Discord handle']
    },
    walletNetwork: {
      type: 'string',
      enum: enabledNetworks,
      title: 'Treasury network'
    },
    walletAddress: {
      type: 'string',
      format: 'address',
      title: 'Treasury address',
      examples: ['0x0000…']
    }
  }
};

const formErrors = computed(() => validateForm(definition, props.form));

watch(formErrors, value => emit('errors', value));

onMounted(() => {
  emit('errors', formErrors.value);
});
</script>

<template>
  <h3 v-if="showTitle" class="mb-4">Space profile</h3>
  <div class="s-box">
    <SIObject
      :model-value="form"
      :error="formErrors"
      :definition="definition"
      @pick="field => emit('pick', field)"
    />
  </div>
</template>
