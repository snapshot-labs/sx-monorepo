<script setup lang="ts">
import { validateForm } from '@/helpers/validation';
import { getNetwork, enabledNetworks } from '@/networks';

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
  (e: 'no-network');
}>();

const availableNetworks = enabledNetworks.map(id => ({
  id,
  name: getNetwork(id).name
}));

const definition = computed(() => {
  return {
    type: 'object',
    title: 'Space',
    additionalProperties: true,
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
        type: ['string', 'null'],
        enum: [null, ...enabledNetworks],
        options: [{ id: null, name: 'No treasury' }, ...availableNetworks],
        title: 'Treasury network',
        nullable: true
      },
      ...(props.form.walletNetwork !== null
        ? {
            walletAddress: {
              type: 'string',
              title: 'Treasury address',
              examples: ['0x0000…'],
              format: 'address',
              minLength: 1
            }
          }
        : {})
    }
  };
});

watch(
  () => props.form.walletNetwork,
  to => {
    if (to === null) emit('no-network');
  }
);

const formErrors = computed(() => validateForm(definition.value, props.form));

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
