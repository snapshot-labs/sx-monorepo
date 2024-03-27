<script setup lang="ts">
import { MAX_SYMBOL_LENGTH } from '@/helpers/constants';
import { validateForm } from '@/helpers/validation';
import { SpaceMetadataTreasury, SpaceMetadataDelegation, NetworkID } from '@/types';

const props = withDefaults(
  defineProps<{
    showTitle?: boolean;
    form: any;
    treasuriesValue: SpaceMetadataTreasury[];
    delegationsValue: SpaceMetadataDelegation[];
    id?: string;
    space?: {
      id: string;
      cover: string;
      avatar: string;
      network: NetworkID;
    };
  }>(),
  {
    showTitle: true
  }
);

const emit = defineEmits<{
  (e: 'errors', value: any);
  (e: 'treasuries', value: SpaceMetadataTreasury[]);
  (e: 'delegations', value: SpaceMetadataDelegation[]);
  (e: 'pick', field: any);
}>();

const modalOpen = ref({
  treasury: false,
  delegation: false
});

const editedTreasury = ref<number | null>(null);
const treasuryInitialState = ref<any | null>(null);

const editedDelegation = ref<number | null>(null);
const delegationInitialState = ref<SpaceMetadataDelegation | null>(null);

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
        default: props.id || '0x2121212121212121212121212121212121212121212121212121212121212121'
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
      }
    }
  };
});

const formErrors = computed(() =>
  validateForm(definition.value, props.form, { skipEmptyOptionalFields: true })
);

function addTreasuryConfig(config: SpaceMetadataTreasury) {
  const newValue = [...props.treasuriesValue];

  if (editedTreasury.value !== null) {
    newValue[editedTreasury.value] = config;
    editedTreasury.value = null;
  } else {
    newValue.push(config);
  }

  emit('treasuries', newValue);
}

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

function addTreasury() {
  editedTreasury.value = null;
  treasuryInitialState.value = null;

  modalOpen.value.treasury = true;
}

function addDelegation() {
  editedDelegation.value = null;
  delegationInitialState.value = null;

  modalOpen.value.delegation = true;
}

function editTreasury(index: number) {
  editedTreasury.value = index;
  treasuryInitialState.value = props.treasuriesValue[index];

  modalOpen.value.treasury = true;
}

function editDelegation(index: number) {
  editedDelegation.value = index;
  delegationInitialState.value = props.delegationsValue[index];

  modalOpen.value.delegation = true;
}

function deleteTreasury(index: number) {
  const newValue = [
    ...props.treasuriesValue.slice(0, index),
    ...props.treasuriesValue.slice(index + 1)
  ];
  emit('treasuries', newValue);
}

function deleteDelegation(index: number) {
  const newValue = [
    ...props.delegationsValue.slice(0, index),
    ...props.delegationsValue.slice(index + 1)
  ];
  emit('delegations', newValue);
}

watch(formErrors, value => emit('errors', value));

onMounted(() => {
  emit('errors', formErrors.value);
});
</script>

<template>
  <h3 v-if="showTitle" class="mb-4">Space profile</h3>
  <UiInputStampCover v-model="(form as any).cover" :space="space" />
  <div class="s-box p-4 -mt-[80px]">
    <UiForm
      :model-value="form"
      :error="formErrors"
      :definition="definition"
      @pick="field => emit('pick', field)"
    />
    <h4 class="eyebrow mb-2">Treasuries</h4>
    <div
      v-for="(treasury, i) in props.treasuriesValue"
      :key="i"
      class="flex justify-between items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
    >
      <div class="flex min-w-0">
        <div class="whitespace-nowrap">{{ treasury.name }}</div>
      </div>
      <div class="flex gap-3">
        <a @click="editTreasury(i)">
          <IH-pencil />
        </a>
        <a @click="deleteTreasury(i)">
          <IH-trash />
        </a>
      </div>
    </div>
    <UiButton class="w-full" @click="addTreasury">Add treasury</UiButton>
    <h4 class="eyebrow my-2">Delegations</h4>
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
    <ModalTreasuryConfig
      :open="modalOpen.treasury"
      :initial-state="treasuryInitialState ?? undefined"
      @close="modalOpen.treasury = false"
      @add="addTreasuryConfig"
    />
    <ModalDelegationConfig
      :open="modalOpen.delegation"
      :initial-state="delegationInitialState ?? undefined"
      @close="modalOpen.delegation = false"
      @add="addDelegationConfig"
    />
  </teleport>
</template>
