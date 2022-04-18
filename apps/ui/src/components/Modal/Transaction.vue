<script setup>
import { reactive, ref, watch } from 'vue';
import { isAddress } from '@ethersproject/address';
import { Interface } from '@ethersproject/abi';
import getProvider from '@snapshot-labs/snapshot.js/src/utils/provider';
import { getABI } from '@/helpers/etherscan';
import { abiToDefinition, clone } from '@/helpers/utils';

const showAbiInput = ref(false);
const abiStr = ref('');
const method = ref({});
const methods = ref([]);
const definition = ref({});
const loading = ref(false);

const emit = defineEmits(['add', 'close']);

const form = reactive({
  to: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844',
  value: '',
  method: '',
  args: {},
  abi: [],
  data: ''
});

function handleSubmit() {
  const tx = clone(form);
  tx.args = Object.values(tx.args);
  const iface = new Interface(tx.abi);
  tx.data = iface.encodeFunctionData(tx.method, tx.args);
  const decodedTx = JSON.parse(JSON.stringify(iface.parseTransaction(tx)));
  decodedTx.to = tx.to;
  emit('add', decodedTx);
  emit('close');
}

watch(
  () => form.method,
  () => {
    definition.value = {};
    if (form.method) {
      method.value = form.abi.find(item => item.name === form.method);
      definition.value = abiToDefinition(method.value);
    }
  }
);

watch(
  () => form.to,
  async v => {
    form.abi = [];
    abiStr.value = '';
    methods.value = [];
    method.value = {};
    definition.value = {};
    showAbiInput.value = false;
    if (isAddress(v)) {
      const provider = getProvider('5');
      loading.value = true;
      const code = await provider.getCode(v);
      if (code !== '0x') {
        console.log('Address is valid');
        try {
          form.abi = await getABI(v);
          abiStr.value = JSON.stringify(form.abi, null, 2);
          methods.value = form.abi
            .filter(
              i => ['function'].includes(i.type) && i.stateMutability !== 'view'
            )
            .map(i => i.name);
          form.method = methods.value[0];
        } catch (e) {
          showAbiInput.value = true;
          console.log(e);
        }
      }
      loading.value = false;
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template v-slot:header>
      <h3 v-text="'Add transaction'" />
    </template>
    <div class="s-compact p-4">
      <div class="relative">
        <UiLoading v-if="loading" class="absolute top-[14px] right-3" />
        <SIString
          v-model="form.to"
          :definition="{
            type: 'string',
            title: 'Contract address'
          }"
        />
      </div>
      <div v-if="showAbiInput" class="s-base">
        <div v-text="'ABI'" class="s-label" />
        <textarea v-model="abiStr" class="s-input mb-3 h-[140px]" />
      </div>
      <div v-if="methods.length > 0" class="s-base">
        <div v-text="'Method'" class="s-label" />
        <select v-model="form.method" class="s-input h-[45px]">
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
      <div v-if="method.name && method.inputs.length > 0 && definition">
        <SIObject v-model="form.args" :definition="definition" />
      </div>
    </div>
    <template v-slot:footer>
      <UiButton @click="handleSubmit" class="w-full"> Confirm </UiButton>
    </template>
  </UiModal>
</template>
