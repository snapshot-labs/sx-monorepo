<script setup lang="ts">
import { MAX_SYMBOL_LENGTH } from '@/helpers/constants';
import { validateForm } from '@/helpers/validation';
import { offchainNetworks } from '@/networks';
import { NetworkID } from '@/types';

const SPACE_CATEGORIES = [
  { id: 'protocol', name: 'Protocol' },
  { id: 'social', name: 'Social' },
  { id: 'investment', name: 'Investment' },
  { id: 'grant', name: 'Grant' },
  { id: 'service', name: 'Service' },
  { id: 'media', name: 'Media' },
  { id: 'creator', name: 'Creator' },
  { id: 'collector', name: 'Collector' }
];

const props = defineProps<{
  form: any;
  id?: string;
  space?: {
    id: string;
    cover: string;
    avatar: string;
    network: NetworkID;
  };
}>();

const emit = defineEmits<{
  (e: 'errors', value: any);
  (e: 'pick', field: any);
}>();

const isOffchainNetwork = computed(
  () => props.space && offchainNetworks.includes(props.space.network)
);

const profileDefinition = computed(() => {
  const offchainProperties = {
    categories: {
      type: 'array',
      items: {
        type: 'string',
        enum: SPACE_CATEGORIES.map(c => c.id)
      },
      options: SPACE_CATEGORIES,
      title: 'Categories',
      examples: ['Select up to 2 categories'],
      maxItems: 2
    }
  };

  return {
    type: 'object',
    title: 'Profile',
    additionalProperties: true,
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        title: 'Name',
        minLength: 1,
        maxLength: 32,
        examples: ['Space name']
      },
      description: {
        type: 'string',
        format: 'long',
        title: 'About',
        maxLength: 160,
        examples: ['Space description']
      },
      ...(isOffchainNetwork.value ? offchainProperties : {})
    }
  };
});

const votingPowerDefinition = computed(() => ({
  type: 'object',
  title: 'Voting power',
  additionalProperties: true,
  required: [],
  properties: {
    votingPowerSymbol: {
      type: 'string',
      title: 'Voting power symbol',
      examples: ['e.g. VP'],
      maxLength: isOffchainNetwork ? 16 : MAX_SYMBOL_LENGTH,
      minLength: isOffchainNetwork ? 1 : undefined
    }
  }
}));

const socialAccountsDefinition = computed(() => {
  const onchainProperties = {
    discord: {
      type: 'string',
      format: 'discord-handle',
      title: 'Discord',
      examples: ['Discord handle or invite code']
    }
  };

  const offchainProperties = {
    coingecko: {
      type: 'string',
      format: 'coingecko-handle',
      title: 'CoinGecko handle',
      examples: ['e.g. uniswap'],
      maxLength: 32
    }
  };

  return {
    type: 'object',
    title: 'Social accounts',
    additionalProperties: true,
    required: [],
    properties: {
      externalUrl: {
        type: 'string',
        format: 'uri',
        title: 'Website',
        examples: ['Website URL'],
        maxLength: 256
      },
      github: {
        type: 'string',
        format: 'github-handle',
        title: 'GitHub',
        examples: ['GitHub handle'],
        maxLength: 39
      },
      twitter: {
        type: 'string',
        format: 'twitter-handle',
        title: 'X (Twitter)',
        examples: ['X (Twitter) handle'],
        maxLength: 15
      },
      ...(isOffchainNetwork.value ? offchainProperties : onchainProperties)
    }
  };
});

const formErrors = computed(() => {
  const validationOpts = {
    skipEmptyOptionalFields: true
  };

  return {
    ...validateForm(profileDefinition.value, props.form, validationOpts),
    ...validateForm(votingPowerDefinition.value, props.form, validationOpts),
    ...validateForm(socialAccountsDefinition.value, props.form, validationOpts)
  };
});

watch(formErrors, value => emit('errors', value));

onMounted(() => {
  emit('errors', formErrors.value);
});
</script>

<template>
  <UiInputStampCover v-model="(form as any).cover" :space="space" />
  <div class="s-box p-4 mt-[-80px] max-w-[640px]">
    <UiInputStamp
      v-model="(form as any).avatar"
      :definition="{
        type: 'string',
        format: 'stamp',
        title: 'Avatar',
        default: `${space?.network || 'eth'}:${props.id || '0x2121212121212121212121212121212121212121212121212121212121212121'}`
      }"
    />
    <h4 class="eyebrow mb-2 font-medium">Profile</h4>
    <UiForm
      :model-value="form"
      :error="formErrors"
      :definition="profileDefinition"
    />
    <h4 class="eyebrow mt-4 mb-2 font-medium">Voting power</h4>
    <UiForm
      :model-value="form"
      :error="formErrors"
      :definition="votingPowerDefinition"
    />
    <h4 class="eyebrow mt-4 mb-2 font-medium">Social accounts</h4>
    <UiForm
      :model-value="form"
      :error="formErrors"
      :definition="socialAccountsDefinition"
    />
  </div>
</template>
