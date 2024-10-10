<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { getNetwork } from '@/networks';
import { ChainId, NetworkID } from '@/types';

const CUSTOM_ERROR_SYMBOL = Symbol('customError');

const props = withDefaults(
  defineProps<{
    open: boolean;
    networkId: NetworkID;
    strategyAddress: string;
    initialState?: any;
    initialNetwork?: ChainId;
    definition?: any;
    customErrorValidation?: (
      value: Record<string, any>,
      network: ChainId
    ) => string | undefined;
    withNetworkSelector?: boolean;
  }>(),
  {
    withNetworkSelector: false
  }
);

const emit = defineEmits<{
  (e: 'close');
  (e: 'save', value: Record<string, any>, network: ChainId);
}>();

const network: Ref<ChainId> = ref('');
const showPicker = ref(false);
const isDefinitionLoading = ref(false);
const pickerField: Ref<string | null> = ref(null);
const searchValue = ref('');
const form: Ref<Record<string, any>> = ref({});
const rawParams = ref('');

const definition = computedAsync(
  async () => {
    if (props.definition) return props.definition;

    const network = getNetwork(props.networkId);

    const strategy = await network.api.loadStrategy(props.strategyAddress);
    if (!strategy) return null;

    return strategy.paramsDefinition;
  },
  null,
  { evaluating: isDefinitionLoading }
);

const formErrors = computed(() => {
  let errors = {} as Record<string | symbol, string>;

  if (props.withNetworkSelector && !network.value) {
    errors.network = 'Network is required';
  }

  if (!props.definition) {
    try {
      JSON.parse(rawParams.value);
    } catch (e) {
      return { rawParams: 'Invalid JSON' };
    }
  }

  const value = definition.value ? form.value : JSON.parse(rawParams.value);
  const customError = props.customErrorValidation?.(value, network.value);
  if (customError) errors[CUSTOM_ERROR_SYMBOL] = customError;

  if (props.definition) {
    return {
      ...errors,
      ...validateForm(props.definition, form.value, {
        skipEmptyOptionalFields: true
      })
    };
  }

  return errors;
});

function handlePickerClick(field: string) {
  showPicker.value = true;
  pickerField.value = field;
}

function handlePickerSelect(value: string) {
  showPicker.value = false;

  if (!pickerField.value) return;

  form.value[pickerField.value] = value;
}

async function handleSubmit() {
  const value = definition.value ? form.value : JSON.parse(rawParams.value);

  emit('save', value, network.value);
}

watchEffect(() => {
  if (props.open && props.initialNetwork) {
    network.value = props.initialNetwork;
  }
});

watchEffect(() => {
  if (props.open && props.initialState) {
    form.value = clone(props.initialState);
    rawParams.value = JSON.stringify(props.initialState, null, 2);
  }
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Edit strategy</h3>
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
    <div v-if="isDefinitionLoading" class="p-4 flex">
      <UiLoading class="m-auto" />
    </div>
    <PickerContact
      v-else-if="showPicker"
      :loading="false"
      :search-value="searchValue"
      @pick="handlePickerSelect"
    />

    <div v-else class="s-box p-4">
      <UiMessage
        v-if="formErrors[CUSTOM_ERROR_SYMBOL]"
        type="danger"
        class="mb-3"
      >
        {{ formErrors[CUSTOM_ERROR_SYMBOL] }}
      </UiMessage>
      <UiSelectorNetwork
        v-if="withNetworkSelector"
        v-model="network"
        :definition="{
          type: ['string', 'number'],
          title: 'Network',
          examples: ['Select network'],
          networkId
        }"
      />
      <UiForm
        v-if="definition"
        v-model="form"
        :error="formErrors"
        :definition="definition"
        @pick="handlePickerClick"
      />
      <UiTextarea
        v-else
        v-model:model-value="rawParams"
        :definition="{
          type: 'string',
          title: 'Strategy parameters'
        }"
        :error="formErrors.rawParams"
      />
    </div>
    <template v-if="!showPicker && !isDefinitionLoading" #footer>
      <UiButton
        class="w-full"
        :disabled="
          Object.keys(formErrors).length > 0 ||
          !!formErrors[CUSTOM_ERROR_SYMBOL]
        "
        @click="handleSubmit"
      >
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>

<style lang="scss" scoped>
:deep(textarea) {
  min-height: 140px !important;
}
</style>
