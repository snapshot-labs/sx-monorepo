<script setup lang="ts">
import { Fragment, Interface, JsonFragment } from '@ethersproject/abi';
import { isAddress } from '@ethersproject/address';
import { getABI } from '@/helpers/etherscan';
import { getProvider } from '@/helpers/provider';
import { resolver } from '@/helpers/resolver';
import { createContractCallTransaction } from '@/helpers/transactions';
import { abiToDefinition, clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { Contact } from '@/types';

const DEFAULT_FORM_STATE = {
  to: '',
  abi: [] as (Fragment & JsonFragment)[],
  method: '',
  args: {},
  amount: ''
};

const props = defineProps<{
  open: boolean;
  network: number | string;
  extraContacts?: Contact[];
  initialState?: any;
}>();

const emit = defineEmits(['add', 'close']);

const loading = ref(false);
const showPicker = ref(false);
const pickerField: Ref<string | null> = ref(null);
const searchValue = ref('');
const ignoreFormUpdates = ref(true);
const addressInvalid = ref(false);
const showAbiInput = ref(false);
const abiStr = ref('');
const formValidated = ref(false);
const formErrors = ref({} as Record<string, any>);
const argsValidated = ref(false);
const argsErrors = ref({} as Record<string, any>);

const form = reactive(clone(DEFAULT_FORM_STATE));

const iface = computed(() => {
  return new Interface(form.abi);
});

const methods = computed(() => {
  return Object.entries(iface.value.functions)
    .filter(
      ([, value]) =>
        value.type === 'function' && value.stateMutability !== 'view'
    )
    .map(([name]) => name);
});

const currentMethod = computed(() => {
  if (!form.method) return null;

  return iface.value.getFunction(form.method);
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

const formValidator = computed(() =>
  getValidator({
    $async: true,
    type: 'object',
    properties: {
      to: {
        type: 'string',
        format: 'ens-or-address'
      },
      abi: {
        type: 'string',
        format: 'abi'
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
  })
);
const argsValidator = computed(() => getValidator(definition.value));

const errors = computed(() => {
  const errors = { ...formErrors.value };

  if (addressInvalid.value) {
    errors.to = 'No contract found at this address.';
  }

  return errors;
});
const formValid = computed(
  () =>
    form.abi.length > 0 &&
    formValidated.value &&
    Object.keys(errors.value).length === 0 &&
    argsValidated.value &&
    Object.keys(argsErrors.value).length === 0
);

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

async function handleSubmit() {
  const tx = await createContractCallTransaction({ form: clone(form) });

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
  addressInvalid.value = false;
  showAbiInput.value = false;

  let contractAddress = to;
  const resolvedTo = await resolver.resolveName(form.to);
  if (resolvedTo?.address) contractAddress = resolvedTo.address;

  if (!isAddress(contractAddress)) {
    console.log('not an address');
    return;
  }

  if (typeof props.network === 'string') {
    console.log('network is not a number (starknet is not supported)');
    return;
  }

  loading.value = true;
  const provider = getProvider(props.network);

  try {
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      addressInvalid.value = true;
      return;
    }

    form.abi = await getABI(props.network, contractAddress);
  } catch (e) {
    console.log(e);
    showAbiInput.value = true;
  } finally {
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
    if (abi.length === 0) return;
    new Interface(abi);
    form.abi = abi;
    showAbiInput.value = false;
  } catch (e) {
    console.log('Invalid abi', value);
  }
});

watchImmediate(
  () => props.open,
  open => {
    if (!open) return;

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

watchEffect(async () => {
  argsValidated.value = false;

  argsErrors.value = await argsValidator.value.validateAsync(form.args);
  argsValidated.value = true;
});

watchEffect(async () => {
  formValidated.value = false;

  formErrors.value = await formValidator.value.validateAsync({
    to: form.to,
    abi: showAbiInput.value ? abiStr.value : undefined,
    amount: form.amount
  });
  formValidated.value = true;
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Add transaction'" />
      <template v-if="showPicker">
        <button
          type="button"
          class="absolute left-0 -top-1 p-4"
          @click="showPicker = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </button>
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
      <PickerContact
        :loading="false"
        :search-value="searchValue"
        :extra-contacts="extraContacts"
        @pick="handlePickerSelect"
      />
    </template>
    <div
      v-show="
        !showPicker /* has to use v-show so dirty flag works, need to find a better way to handle it */
      "
      class="s-box p-4"
    >
      <div class="relative">
        <UiLoading v-if="loading" class="absolute top-[14px] right-3 z-10" />
        <UiInputAddress
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
      <UiTextarea
        v-if="showAbiInput"
        v-model="abiStr"
        :error="errors.abi"
        :definition="{
          type: 'string',
          format: 'abi',
          title: 'ABI'
        }"
      />
      <div v-if="methods.length > 0" class="s-base">
        <div class="s-label" v-text="'Method'" />
        <select v-model="form.method" class="s-input h-[45px]">
          <option v-for="(method, i) in methods" :key="i" v-text="method" />
        </select>
      </div>
      <UiInputString
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
        <UiForm
          v-model="form.args"
          :error="argsErrors"
          :definition="definition"
          @pick="handlePickerClick"
        />
      </div>
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit"
        >Confirm</UiButton
      >
    </template>
  </UiModal>
</template>
