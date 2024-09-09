<script setup lang="ts">
import { MAX_SYMBOL_LENGTH } from '@/helpers/constants';
import { validateForm } from '@/helpers/validation';
import { NetworkID } from '@/types';

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

const definition = computed(() => {
  return {
    type: 'object',
    title: 'Space',
    additionalProperties: true,
    required: ['name'],
    properties: {
      avatar: {
        type: 'string',
        format: 'stamp',
        title: 'Avatar',
        default:
          props.id ||
          '0x2121212121212121212121212121212121212121212121212121212121212121'
      },
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
        title: 'X (Twitter)',
        examples: ['X (Twitter) handle']
      },
      discord: {
        type: 'string',
        format: 'discord-handle',
        title: 'Discord',
        examples: ['Discord handle or invite code']
      },
      votingPowerSymbol: {
        type: 'string',
        maxLength: MAX_SYMBOL_LENGTH,
        title: 'Voting power symbol',
        examples: ['e.g. VP']
      }
    }
  };
});

const formErrors = computed(() =>
  validateForm(definition.value, props.form, { skipEmptyOptionalFields: true })
);

watch(formErrors, value => emit('errors', value));

onMounted(() => {
  emit('errors', formErrors.value);
});
</script>

<template>
  <UiInputStampCover v-model="(form as any).cover" :space="space" />
  <div class="s-box p-4 mt-[-80px] max-w-[640px]">
    <UiForm :model-value="form" :error="formErrors" :definition="definition" />
  </div>
</template>
