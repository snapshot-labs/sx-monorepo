<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const props = withDefaults(
  defineProps<{
    open: boolean;
    networkId: NetworkID;
    strategyAddress: string;
    initialState?: any;
    initialNetwork?: string;
    definition?: any;
    withNetworkSelector?: boolean;
  }>(),
  {
    withNetworkSelector: false
  }
);

const emit = defineEmits<{
  (e: 'close');
  (e: 'save', value: Record<string, any>, network: string);
}>();

const network = ref('');
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
  let errors = {} as Record<string, string>;

  if (props.withNetworkSelector && !network.value) {
    errors.network = 'Network is required';
  }

  if (!props.definition) {
    try {
      JSON.parse(rawParams.value);
      return {};
    } catch (e) {
      return { rawParams: 'Invalid JSON' };
    }
  }

  return {
    ...errors,
    ...validateForm(props.definition, form.value, {
      skipEmptyOptionalFields: true
    })
  };
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
  if (props.initialNetwork) {
    network.value = props.initialNetwork;
  }
});

watchEffect(() => {
  if (props.initialState) {
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
    <PickerContact
      v-if="showPicker"
      :loading="false"
      :search-value="searchValue"
      @pick="handlePickerSelect"
    />
    <div v-if="isDefinitionLoading" class="p-4 flex">
      <UiLoading class="m-auto" />
    </div>
    <div v-else class="s-box p-4">
      <UiSelectorNetwork
        v-if="withNetworkSelector"
        v-model="network"
        :network-id="networkId"
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
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
