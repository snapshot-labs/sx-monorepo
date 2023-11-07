<script setup lang="ts">
import { clone } from '@/helpers/utils';
import type { Space, SpaceMetadata, NetworkID } from '@/types';

const DEFAULT_FORM_STATE: SpaceMetadata = {
  name: '',
  avatar: '',
  cover: '',
  description: '',
  externalUrl: '',
  twitter: '',
  github: '',
  discord: '',
  votingPowerSymbol: '',
  walletNetwork: null,
  walletAddress: null,
  delegationApiType: null,
  delegationApiUrl: null,
  delegationContractAddress: null,
  delegationContractNetwork: null
};

const props = defineProps<{
  open: boolean;
  space: Space;
}>();

const emit = defineEmits(['add', 'close']);

const { updateMetadata } = useActions();

const showPicker = ref(false);
const pickerField = ref(null as string | null);
const searchValue = ref('');
const sending = ref(false);
const formErrors = ref({} as Record<string, string>);
const form: SpaceMetadata = reactive(clone(DEFAULT_FORM_STATE));

function handlePick(field: string) {
  pickerField.value = field;
  showPicker.value = true;
}

function handlePickerSelect(value: string) {
  if (!pickerField.value) return;

  showPicker.value = false;
  form[pickerField.value] = value;
}

async function handleSubmit() {
  sending.value = true;

  try {
    await updateMetadata(props.space, form);
    emit('close');
  } finally {
    sending.value = false;
  }
}

watch(
  () => props.open,
  () => {
    showPicker.value = false;

    form.name = props.space.name;
    form.avatar = props.space.avatar;
    form.cover = props.space.cover;
    form.description = props.space.about || '';
    form.externalUrl = props.space.external_url;
    form.github = props.space.github;
    form.discord = props.space.discord;
    form.twitter = props.space.twitter;
    form.votingPowerSymbol = props.space.voting_power_symbol;
    form.delegationApiType = props.space.delegation_api_type;
    form.delegationApiUrl = props.space.delegation_api_url;

    const [walletNetwork, walletAddress] = props.space.wallet.split(':');
    if (walletNetwork && walletAddress) {
      form.walletNetwork = walletNetwork as NetworkID;
      form.walletAddress = walletAddress;
    } else {
      form.walletNetwork = null;
      form.walletAddress = null;
    }

    if (props.space.delegation_contract) {
      const [delegationContractNetwork, delegationContractAddress] =
        props.space.delegation_contract.split(':');

      if (delegationContractNetwork && delegationContractAddress) {
        form.delegationContractNetwork = delegationContractNetwork as NetworkID;
        form.delegationContractAddress = delegationContractAddress;
      } else {
        form.delegationContractNetwork = null;
        form.delegationContractAddress = null;
      }
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-if="!showPicker">Edit profile</h3>
      <template v-else>
        <h3>Select contact</h3>
        <a class="absolute left-0 -top-1 p-4 text-color" @click="showPicker = false">
          <IH-arrow-narrow-left class="mr-2" />
        </a>
        <div class="flex items-center border-t px-2 py-3 mt-3 -mb-3">
          <IH-search class="mx-2" />
          <input
            ref="searchInput"
            v-model="searchValue"
            type="text"
            placeholder="Search"
            class="flex-auto bg-transparent text-skin-link"
          />
        </div>
      </template>
    </template>
    <BlockContactPicker
      v-if="showPicker"
      :loading="false"
      :search-value="searchValue"
      @pick="handlePickerSelect"
    />
    <BlockSpaceFormProfile
      v-else
      :id="space.id"
      :space="space"
      :show-title="false"
      :form="form"
      @pick="handlePick"
      @no-network="form.walletAddress = null"
      @errors="v => (formErrors = v)"
    />
    <template v-if="!showPicker" #footer>
      <UiButton
        class="w-full"
        :loading="sending"
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        Save
      </UiButton>
    </template>
  </UiModal>
</template>
