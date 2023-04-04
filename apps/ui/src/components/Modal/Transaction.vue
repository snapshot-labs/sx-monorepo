<script setup lang="ts">
import { Interface, Fragment, JsonFragment } from '@ethersproject/abi';
import { isAddress } from '@ethersproject/address';
import getProvider from '@snapshot-labs/snapshot.js/src/utils/provider';
import { getABI } from '@/helpers/etherscan';
import { createContractCallTransaction } from '@/helpers/transactions';
import { abiToDefinition, clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';

const DEFAULT_FORM_STATE = {
  to: '',
  abi: [] as (Fragment & JsonFragment)[],
  method: '',
  args: {},
  amount: ''
};

const props = defineProps({
  open: Boolean,
  initialState: Object
});

const emit = defineEmits(['add', 'close']);

const loading = ref(false);
const showPicker = ref(false);
const pickerField: Ref<string | null> = ref(null);
const searchValue = ref('');
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
  if (!form.method) return null;

  const method = form.abi.find(item => item.name === form.method);
  if (!method) return null;

  return method as Fragment & JsonFragment;
});

const definition = computed(() => {
  if (currentMethod.value && currentMethod.value.name && currentMethod.value.inputs.length > 0) {
    return abiToDefinition(currentMethod.value);
  }

  return {};
});

const errors = computed(() =>
  validateForm(
    {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          format: 'address'
        },
        ...(currentMethod.value?.payable
          ? {
              amount: {
                type: 'string',
                format: 'ethValue'
              }
            }
          : {})
      },
      additionalProperties: true
    },
    { to: form.to, amount: form.amount }
  )
);
const argsErrors = computed(() => validateForm(definition.value, form.args));

function handlePickerClick(field: string) {
  showPicker.value = true;
  pickerField.value = field;
}

function handlePickerSelect(value: string) {
  showPicker.value = false;

  if (!pickerField.value) return;

  const isTopLevel = pickerField.value === 'to';
  if (isTopLevel) form[pickerField.value] = value;
  else form.args[pickerField.value] = value;
}

function handleSubmit() {
  const tx = createContractCallTransaction({ form: clone(form) });

  emit('add', tx);
  emit('close');
}

function handleMethodChange() {
  form.args = {};
  form.amount = DEFAULT_FORM_STATE.amount;
}

async function handleToChange(to: string) {
  form.abi = [];
  abiStr.value = '';
  showAbiInput.value = false;
  if (isAddress(to)) {
    const provider = getProvider('5');
    loading.value = true;
    const code = await provider.getCode(to);
    if (code !== '0x') {
      console.log('Address is valid');
      try {
        form.abi = await getABI(to);
      } catch (e) {
        showAbiInput.value = true;
        console.log(e);
      }
    }
    loading.value = false;
  }
}

watch(methods, methods => {
  if (methods.length === 0) return;

  if (!form.method || !methods.includes(form.method)) {
    form.method = methods[0];
  }
});

watch(
  [currentMethod, () => form.to],
  ([currentMethod, currentTo], [previousMethod, previousTo]) => {
    if (ignoreFormUpdates.value) {
      ignoreFormUpdates.value = false;
      return;
    }

    if (currentMethod !== previousMethod) handleMethodChange();
    if (currentTo !== previousTo) handleToChange(currentTo);
  }
);

watch(abiStr, value => {
  try {
    const abi = JSON.parse(value);
    new Interface(abi);
    form.abi = abi;
    showAbiInput.value = false;
  } catch (err) {
    console.log('invalid abi', value);
  }
});

watch(
  () => props.open,
  () => {
    showPicker.value = false;

    if (props.initialState) {
      form.to = props.initialState.recipient;
      form.abi = props.initialState.abi;
      form.method = props.initialState.method;
      form.args = props.initialState.args;
      form.amount = props.initialState.amount;

      ignoreFormUpdates.value = true;
    } else {
      form.to = DEFAULT_FORM_STATE.to;
      form.abi = DEFAULT_FORM_STATE.abi;
      form.method = DEFAULT_FORM_STATE.method;
      form.args = DEFAULT_FORM_STATE.args;
      form.amount = DEFAULT_FORM_STATE.amount;

      ignoreFormUpdates.value = false;
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Add transaction'" />
      <template v-if="showPicker">
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
    <template v-if="showPicker">
      <BlockContactPicker :loading="false" :search-value="searchValue" @pick="handlePickerSelect" />
    </template>
    <div v-else class="s-box p-4">
      <div class="relative">
        <UiLoading v-if="loading" class="absolute top-[14px] right-3 z-10" />
        <SIAddress
          v-model="form.to"
          :error="errors.to"
          :show-picker="!loading"
          :definition="{
            type: 'string',
            title: 'Contract address',
            examples: ['Address or ENS']
          }"
          @pick="handlePickerClick('to')"
        />
      </div>
      <div v-if="showAbiInput" class="s-base">
        <div class="s-label" v-text="'ABI'" />
        <textarea v-model="abiStr" class="s-input mb-3 h-[140px]" />
      </div>
      <div v-if="methods.length > 0" class="s-base">
        <div class="s-label" v-text="'Method'" />
        <select v-model="form.method" class="s-input h-[45px]">
          <option v-for="(method, i) in methods" :key="i" v-text="method" />
        </select>
      </div>
      <SIString
        v-if="currentMethod?.payable"
        v-model="form.amount"
        :error="errors.amount"
        :definition="{
          format: 'ethValue',
          title: 'ETH amount',
          examples: ['Payable amount']
        }"
      />
      <div v-if="definition">
        <SIObject
          v-model="form.args"
          :error="argsErrors"
          :definition="definition"
          @pick="handlePickerClick"
        />
      </div>
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton class="w-full" @click="handleSubmit">Confirm</UiButton>
    </template>
  </UiModal>
</template>
