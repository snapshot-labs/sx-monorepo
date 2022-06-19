<script setup>
import { reactive, ref, computed, watch, nextTick } from 'vue';
import { useNfts } from '@/composables/useNfts';
import spaces from '@/helpers/spaces.json';

const props = defineProps({
  open: Boolean
});

const emit = defineEmits(['close']);

const searchInput = ref(null);
const showPicker = ref(false);
const searchValue = ref('');

const form = reactive({
  to: '',
  nft: '',
  amount: ''
});

const { loading, loaded, nfts, nftsMap, loadNfts } = useNfts();

const currentNft = computed(() => nftsMap.value?.get(form.nft));

function handlePickerClick() {
  if (!loaded.value) {
    loadNfts(spaces.pasta.wallets[0]);
  }

  showPicker.value = true;

  nextTick(() => {
    if (searchInput.value) {
      searchInput.value.focus();
    }
  });
}

watch(
  () => props.open,
  () => {
    showPicker.value = false;
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template v-slot:header>
      <h3 v-text="'Send NFT'" />
      <template v-if="showPicker">
        <a
          class="absolute left-0 -top-1 p-4 text-color"
          @click="showPicker = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </a>
        <div class="flex items-center border-t px-2 py-2 mt-3 -mb-3">
          <IH-search class="mr-2" />
          <input
            v-model="searchValue"
            ref="searchInput"
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
      :searchValue="searchValue"
      @pick="
        form.nft = $event;
        showPicker = false;
      "
    />
    <div class="s-box p-4" v-if="!showPicker">
      <SIString
        v-model="form.to"
        :definition="{
          type: 'string',
          title: 'Recipient',
          examples: ['Address or ENS']
        }"
      />
      <div class="s-base">
        <div v-text="'NFT'" class="s-label" />
        <button class="s-input text-left h-[61px]" @click="handlePickerClick">
          <div class="flex items-center">
            <NftPreview
              v-if="currentNft"
              :item="currentNft"
              class="mr-1"
              :size="20"
            />

            {{ currentNft?.displayTitle || 'Select token' }}
          </div>
        </button>
      </div>
      <SINumber
        :definition="{
          type: 'number',
          title: 'Amount',
          examples: ['0']
        }"
      />
    </div>
    <template v-slot:footer v-if="!showPicker">
      <UiButton class="w-full">Confirm</UiButton>
    </template>
  </UiModal>
</template>
