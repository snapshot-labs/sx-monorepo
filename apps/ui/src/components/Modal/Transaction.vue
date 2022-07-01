<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { isAddress } from '@ethersproject/address';
import getProvider from '@snapshot-labs/snapshot.js/src/utils/provider';
import { getABI } from '@/helpers/etherscan';
import { createContractCallTransaction } from '@/helpers/transactions';
import { abiToDefinition, clone } from '@/helpers/utils';

const DEFAULT_FORM_STATE = {
  to: '',
  abi: [],
  method: '',
  args: {}
};

const props = defineProps({
  open: Boolean,
  initialState: Object
});

const emit = defineEmits(['add', 'close']);

const loading = ref(false);
const ignoreFormUpdates = ref(true);
const showAbiInput = ref(false);
const abiStr = ref('');

const form = reactive(clone(DEFAULT_FORM_STATE));

const methods = computed(() => {
  const methods = form.abi
    .filter(i => ['function'].includes(i.type) && i.stateMutability !== 'view')
    .map(i => i.name);

  return methods;
});

const currentMethod = computed(() => {
  if (!form.method) return {};

  return form.abi.find(item => item.name === form.method) || {};
});

const definition = computed(() => {
  if (
    currentMethod.value &&
    currentMethod.value.name &&
    currentMethod.value.inputs.length > 0
  ) {
    return abiToDefinition(currentMethod.value);
  }

  return {};
});

function handleSubmit() {
  const tx = createContractCallTransaction({ form: clone(form) });

  emit('add', tx);
  emit('close');
}

watch(methods, methods => {
  if (methods.length === 0) return;

  if (!form.method || !methods.includes(form.method)) {
    form.method = methods[0];
  }
});

watch(currentMethod, () => {
  if (ignoreFormUpdates.value === true) {
    ignoreFormUpdates.value = false;
  } else {
    form.args = {};
  }
});

watch(
  () => form.to,
  async v => {
    if (ignoreFormUpdates.value === true) return;

    form.abi = [];
    abiStr.value = '';
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
        } catch (e) {
          showAbiInput.value = true;
          console.log(e);
        }
      }
      loading.value = false;
    }
  }
);

watch(
  () => props.open,
  () => {
    if (props.initialState) {
      form.to = props.initialState.recipient;
      form.abi = props.initialState.abi;
      form.method = props.initialState.method;
      form.args = props.initialState.args;

      ignoreFormUpdates.value = true;
    } else {
      form.to = DEFAULT_FORM_STATE.to;
      form.abi = DEFAULT_FORM_STATE.abi;
      form.method = DEFAULT_FORM_STATE.method;
      form.args = DEFAULT_FORM_STATE.args;

      ignoreFormUpdates.value = false;
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template v-slot:header>
      <h3 v-text="'Add transaction'" />
    </template>
    <div class="s-box p-4">
      <div class="relative">
        <UiLoading v-if="loading" class="absolute top-[14px] right-3" />
        <SIString
          v-model="form.to"
          :definition="{
            type: 'string',
            title: 'Contract address',
            examples: ['Address or ENS']
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
        v-if="currentMethod.payable"
        :definition="{
          type: 'number',
          title: 'ETH value'
        }"
      />
      <div v-if="definition">
        <SIObject v-model="form.args" :definition="definition" />
      </div>
    </div>
    <template v-slot:footer>
      <UiButton @click="handleSubmit" class="w-full">Confirm</UiButton>
    </template>
  </UiModal>
</template>
