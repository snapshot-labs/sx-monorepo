<script setup lang="ts">
import { MAX_SYMBOL_LENGTH } from '@/helpers/constants';
import { validateForm } from '@/helpers/validation';
import { getNetwork, enabledNetworks } from '@/networks';
import { SpaceMetadataDelegation } from '@/types';

const props = withDefaults(
  defineProps<{
    showTitle?: boolean;
    form: any;
    delegationsValue: SpaceMetadataDelegation[];
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
  (e: 'delegations', value: SpaceMetadataDelegation[]);
  (e: 'pick', field: any);
  (e: 'no-network');
}>();

const delegationsModalOpen = ref(false);
const editedDelegation = ref<number | null>(null);
const delegationInitialState = ref<SpaceMetadataDelegation | null>(null);

const availableNetworks = enabledNetworks
  .map(id => {
    const { name, readOnly } = getNetwork(id);

    return {
      id,
      name,
      readOnly
    };
  })
  .filter(network => !network.readOnly);

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
      },
      walletNetwork: {
        type: ['string', 'null'],
        enum: [null, ...availableNetworks.map(network => network.id)],
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

const formErrors = computed(() =>
  validateForm(definition.value, props.form, { skipEmptyOptionalFields: true })
);

function addDelegationConfig(config: SpaceMetadataDelegation) {
  const newValue = [...props.delegationsValue];

  if (editedDelegation.value !== null) {
    newValue[editedDelegation.value] = config;
    editedDelegation.value = null;
  } else {
    newValue.push(config);
  }

  emit('delegations', newValue);
}

function addDelegation() {
  editedDelegation.value = null;
  delegationInitialState.value = null;
  delegationsModalOpen.value = true;
}

function editDelegation(index: number) {
  editedDelegation.value = index;
  delegationInitialState.value = props.delegationsValue[index];

  delegationsModalOpen.value = true;
}

function deleteDelegation(index: number) {
  const newValue = [
    ...props.delegationsValue.slice(0, index),
    ...props.delegationsValue.slice(index + 1)
  ];
  emit('delegations', newValue);
}

watch(formErrors, value => emit('errors', value));

watch(
  () => props.form.walletNetwork,
  to => {
    if (to === null) emit('no-network');
  }
);

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
    <h4 class="eyebrow mb-2">Delegations</h4>
    <div
      v-for="(delegation, i) in props.delegationsValue"
      :key="i"
      class="flex justify-between items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
    >
      <div class="flex min-w-0">
        <div class="whitespace-nowrap">{{ delegation.name }}</div>
      </div>
      <div class="flex gap-3">
        <a @click="editDelegation(i)">
          <IH-pencil />
        </a>
        <a @click="deleteDelegation(i)">
          <IH-trash />
        </a>
      </div>
    </div>
    <UiButton class="w-full" @click="addDelegation">Add delegation</UiButton>
  </div>
  <teleport to="#modal">
    <ModalDelegationConfig
      :open="delegationsModalOpen"
      :initial-state="delegationInitialState ?? undefined"
      @close="delegationsModalOpen = false"
      @add="addDelegationConfig"
    />
  </teleport>
</template>
