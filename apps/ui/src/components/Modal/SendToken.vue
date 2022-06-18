<script setup>
import { reactive } from 'vue';

defineProps({
  open: Boolean
});

const emit = defineEmits(['close']);

const form = reactive({
  to: '',
  token: 'eth',
  amount: '',
  value: ''
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template v-slot:header>
      <h3 v-text="'Send token'" />
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
        <div v-text="'Token'" class="s-label" />
        <select v-model="form.token" class="s-input h-[45px]">
          <option value="eth">Ethereum</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-[12px]">
        <SINumber
          :definition="{
            type: 'number',
            title: 'Amount',
            examples: ['0']
          }"
        />
        <SINumber
          :definition="{
            type: 'number',
            title: 'USD',
            examples: ['0']
          }"
        />
      </div>
    </div>
    <template v-slot:footer>
      <UiButton class="w-full"> Confirm </UiButton>
    </template>
  </UiModal>
</template>
