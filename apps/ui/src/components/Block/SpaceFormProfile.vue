<script setup lang="ts">
import { validateForm } from '@/helpers/validation';
import { getNetwork, enabledNetworks } from '@/networks';

const props = withDefaults(
  defineProps<{
    showTitle?: boolean;
    form: any;
    id?: string;
    space?: {
      id: string;
      cover: string;
    };
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
      avatar: {
        type: 'string',
        format: 'stamp',
        title: 'Avatar',
        default: props.id
      },
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
        format: 'uri',
        title: 'Website',
        examples: ['Website URL']
      },
      github: {
        type: 'string',
        format: 'github-handle',
        title: 'GitHub',
        examples: ['GitHub handle']
      },
      twitter: {
        type: 'string',
        format: 'twitter-handle',
        title: 'Twitter',
        examples: ['Twitter handle']
      },
      discord: {
        type: 'string',
        format: 'discord-handle',
        title: 'Discord',
        examples: ['Discord handle or invite code']
      },
      votingPowerSymbol: {
        type: 'string',
        maxLength: 6,
        title: 'Voting power symbol',
        examples: ['e.g. VP']
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
        : {}),
      delegationApiType: {
        type: ['string', 'null'],
        enum: [null, 'governor-subgraph'],
        options: [
          { id: null, name: 'No delegation API' },
          { id: 'governor-subgraph', name: 'Governor subgraph' }
        ],
        title: 'Delegation API type',
        nullable: true
      },
      ...(props.form.delegationApiType !== null
        ? {
            delegationApiUrl: {
              type: 'string',
              format: 'uri',
              title: 'Delegation API URL',
              examples: ['https://api.thegraph.com/subgraphs/name/arr00/uniswap-governance-v2']
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

const formErrors = computed(() =>
  validateForm(definition.value, props.form, { skipEmptyOptionalFields: true })
);

watch(formErrors, value => emit('errors', value));

onMounted(() => {
  emit('errors', formErrors.value);
});
</script>

<template>
  <h3 v-if="showTitle" class="mb-4">Space profile</h3>
  <SIStampCover v-model="(form as any).cover" :space="space" />
  <div class="s-box p-4 -mt-[80px]">
    <SIObject
      :model-value="form"
      :error="formErrors"
      :definition="definition"
      @pick="field => emit('pick', field)"
    />
  </div>
</template>
