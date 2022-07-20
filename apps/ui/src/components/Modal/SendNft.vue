<script setup lang="ts">
import { reactive, ref, computed, watch, nextTick, Ref } from 'vue';
import { useNfts } from '@/composables/useNfts';
import { createSendNftTransaction } from '@/helpers/transactions';
import { clone } from '@/helpers/utils';

const DEFAULT_FORM_STATE = {
  to: '',
  nft: '',
  amount: ''
};

const props = defineProps({
  open: Boolean,
  address: {
    type: String,
    required: true
  },
  initialState: Object
});

const emit = defineEmits(['add', 'close']);

const searchInput: Ref<HTMLElement | null> = ref(null);
const showPicker = ref(false);
const searchValue = ref('');

const form: { to: string; nft: string; amount: string | number } = reactive(
  clone(DEFAULT_FORM_STATE)
);

const { loading, loaded, nfts, nftsMap, loadNfts } = useNfts();

const currentNft = computed(() => nftsMap.value?.get(form.nft));
const formValid = computed(
  () =>
    currentNft.value &&
    form.to &&
    (currentNft.value.type !== 'erc1155' || form.amount !== '')
);

function handlePickerClick() {
  if (!loaded.value) {
    loadNfts(props.address);
  }

  showPicker.value = true;

  nextTick(() => {
    if (searchInput.value) {
      searchInput.value.focus();
    }
  });
}

function handleSubmit() {
  const tx = createSendNftTransaction({
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

      if (!loaded.value) {
        loadNfts(props.address);
      }
    } else {
      form.to = DEFAULT_FORM_STATE.to;
      form.nft = DEFAULT_FORM_STATE.nft;
      form.amount = DEFAULT_FORM_STATE.amount;
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Send NFT'" />
      <template v-if="showPicker">
        <a
          class="absolute left-0 -top-1 p-4 text-color"
          @click="showPicker = false"
        >
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
    <BlockNftPicker
      v-if="showPicker"
      :nfts="nfts"
      :loading="loading"
      :search-value="searchValue"
      @pick="
        form.nft = $event;
        showPicker = false;
      "
    />
    <div v-if="!showPicker" class="s-box p-4">
      <SIString
        v-model="form.to"
        :definition="{
          type: 'string',
          title: 'Recipient',
          examples: ['Address or ENS']
        }"
      />
      <div class="s-base">
        <div class="s-label" v-text="'NFT'" />
        <button class="s-input text-left h-[61px]" @click="handlePickerClick">
          <div class="flex items-center">
            <NftPreview
              v-if="currentNft"
              :item="currentNft"
              class="mr-2"
              :size="20"
            />
            {{ currentNft?.displayTitle || 'Select NFT' }}
          </div>
        </button>
      </div>
      <SINumber
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
