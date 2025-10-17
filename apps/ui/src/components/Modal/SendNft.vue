<script setup lang="ts">
import { createSendNftTransaction } from '@/helpers/transactions';
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { ChainId, Contact } from '@/types';

const DEFAULT_FORM_STATE = {
  to: '',
  nft: '',
  amount: ''
};

const props = defineProps<{
  open: boolean;
  address: string;
  network: ChainId;
  extraContacts?: Contact[];
  initialState?: any;
}>();

const recipientDefinition = computed(() => ({
  type: 'string',
  format: 'ens-or-address',
  chainId: props.network,
  title: 'Recipient',
  examples: ['Address or ENS']
}));

const formValidator = computed(() =>
  getValidator({
    $async: true,
    type: 'object',
    title: 'TokenTransfer',
    additionalProperties: false,
    required: ['to'],
    properties: {
      to: recipientDefinition.value
    }
  })
);

const emit = defineEmits(['add', 'close']);

const searchInput: Ref<HTMLElement | null> = ref(null);
const showPicker = ref(false);
const pickerType: Ref<'nft' | 'contact' | null> = ref(null);
const searchValue = ref('');
const formValidated = ref(false);
const formErrors = ref({} as Record<string, any>);

const form: { to: string; nft: string; amount: string | number } = reactive(
  clone(DEFAULT_FORM_STATE)
);

const { isPending, nfts, nftsMap } = useNfts({
  treasury: toRef(() => ({
    chainId: props.network,
    address: props.address
  }))
});

const currentNft = computed(() => nftsMap.value?.get(form.nft));

const formValid = computed(
  () =>
    currentNft.value &&
    formValidated.value &&
    Object.keys(formErrors.value).length === 0 &&
    (currentNft.value.type !== 'erc1155' || form.amount !== '')
);

function handlePickerClick(type: 'nft' | 'contact') {
  showPicker.value = true;
  pickerType.value = type;

  nextTick(() => {
    if (searchInput.value) {
      searchInput.value.focus();
    }
  });
}

async function handleSubmit() {
  if (!currentNft.value) return;

  const tx = await createSendNftTransaction({
    nft: currentNft.value,
    address: props.address,
    form: clone(form)
  });

  emit('add', tx);
  emit('close');
}

watch(
  () => props.open,
  () => {
    showPicker.value = false;

    if (props.initialState) {
      form.to = props.initialState.recipient;
      form.nft = `${props.initialState.nft.address}:${props.initialState.nft.id}`;
      form.amount = props.initialState.amount;
    } else {
      form.to = DEFAULT_FORM_STATE.to;
      form.nft = DEFAULT_FORM_STATE.nft;
      form.amount = DEFAULT_FORM_STATE.amount;
    }
  }
);

watchEffect(async () => {
  formValidated.value = false;

  formErrors.value = await formValidator.value.validateAsync({
    to: form.to
  });
  formValidated.value = true;
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Send NFT'" />
      <template v-if="showPicker">
        <button
          type="button"
          class="absolute left-0 -top-1 p-4"
          @click="showPicker = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </button>
        <UiModalSearchInput
          :ref="ref => (searchInput = (ref as any)?.searchInput)"
          v-model="searchValue"
        />
      </template>
    </template>
    <template v-if="showPicker">
      <PickerNft
        v-if="pickerType === 'nft'"
        :nfts="nfts"
        :loading="isPending"
        :search-value="searchValue"
        @pick="
          form.nft = $event;
          showPicker = false;
        "
      />
      <PickerContact
        v-else-if="pickerType === 'contact'"
        :loading="false"
        :search-value="searchValue"
        :extra-contacts="extraContacts"
        @pick="
          form.to = $event;
          showPicker = false;
        "
      />
    </template>
    <div v-if="!showPicker" class="s-box p-4">
      <UiInputAddress
        v-model="form.to"
        :definition="recipientDefinition"
        :error="formErrors.to"
        :required="true"
        @pick="handlePickerClick('contact')"
      />
      <div class="s-base">
        <div class="s-label" v-text="'NFT *'" />
        <button
          type="button"
          class="s-input text-left h-[61px]"
          @click="handlePickerClick('nft')"
        >
          <div class="flex items-center">
            <UiNftImage
              v-if="currentNft"
              :item="currentNft"
              class="mr-2"
              :size="20"
            />
            <div class="truncate">
              {{ currentNft?.displayTitle || 'Select NFT' }}
            </div>
          </div>
        </button>
      </div>
      <UiInputNumber
        v-if="currentNft?.type === 'erc1155'"
        v-model="form.amount"
        :definition="{
          type: 'number',
          title: 'Amount',
          examples: ['0']
        }"
      />
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit">
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
