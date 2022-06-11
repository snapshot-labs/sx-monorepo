<script setup>
import { reactive } from 'vue';

const emit = defineEmits(['close']);

const form = reactive({
  to: '',
  nft: '',
  amount: ''
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template v-slot:header>
      <h3 v-text="'Send NFT'" />
    </template>
    <div class="s-box p-4">
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
        <select v-model="form.nft" class="s-input h-[45px]"></select>
      </div>
      <SINumber
        :definition="{
          type: 'number',
          title: 'Amount',
          examples: ['0']
        }"
      />
    </div>
    <template v-slot:footer>
      <UiButton class="w-full"> Confirm </UiButton>
    </template>
  </UiModal>
</template>
