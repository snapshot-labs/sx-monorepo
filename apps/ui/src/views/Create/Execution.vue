<script setup>
import { ref, watch } from 'vue';
import { isAddress } from '@ethersproject/address';
import snapshot from '@snapshot-labs/snapshot.js';
import { getABI } from '@/helpers/etherscan';

const contract = ref('');
const abi = ref([]);
const abiStr = ref('');
const method = ref({});
const methodInput = ref('');
const methods = ref([]);
const args = ref({});
const definition = ref({});
const loading = ref(false);

watch(methodInput, () => {
  definition.value = {};
  if (methodInput.value) {
    method.value = abi.value.find(item => item.name === methodInput.value);
    const inputs = method.value.inputs.map(input => ({
      type: 'string',
      title: input.name,
      examples: [input.type]
    }));
    definition.value = {
      title: '',
      type: 'object',
      properties: inputs
    };
  }
});

watch(contract, async v => {
  abi.value = [];
  abiStr.value = '';
  methods.value = [];
  method.value = {};
  definition.value = {};
  if (isAddress(v)) {
    const provider = snapshot.utils.getProvider('1');
    loading.value = true;
    const code = await provider.getCode(v);
    if (code !== '0x') {
      console.log('Address is valid');
      abi.value = await getABI(v);
      abiStr.value = JSON.stringify(abi.value, null, 2);
      methods.value = abi.value
        .filter(
          i => ['function'].includes(i.type) && i.stateMutability !== 'view'
        )
        .map(i => i.name);
    }
    loading.value = false;
  }
});
</script>

<template>
  <Container class="pt-5">
    <h1 v-text="'Add execution'" class="mb-4" />
    <div class="s-compact">
      <div class="relative">
        <UiLoading v-if="loading" class="absolute top-[14px] right-3" />
        <SIString
          v-model="contract"
          :definition="{
            type: 'string',
            title: 'Contract address'
          }"
        />
      </div>
      <div class="s-base">
        <div v-text="'ABI'" class="s-label" />
        <textarea v-model="abiStr" class="s-input mb-3 h-[140px]" />
      </div>
      <div v-if="methods.length > 0" class="s-base">
        <div v-text="'Method'" class="s-label" />
        <select v-model="methodInput" class="s-input h-[45px] select-none">
          <option value="">Select</option>
          <option v-for="(method, i) in methods" :key="i" v-text="method" />
        </select>
      </div>
      <SINumber
        v-if="method.payable"
        :definition="{
          type: 'number',
          title: 'ETH value'
        }"
      />
      <div
        v-if="method.name && method.inputs.length > 0 && definition"
        class="x-block p-4 mt-4"
      >
        <SIObject v-model="args" :definition="definition" />
      </div>
    </div>
    <SIBoolean
      v-if="1 === 2"
      :definition="{
        type: 'boolean',
        title: 'Use custom data (hex encoded)'
      }"
    />
  </Container>
</template>
