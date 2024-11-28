<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { NetworkID, SpaceMetadataTreasury } from '@/types';

const DEFAULT_FORM_STATE = {
  name: '',
  address: '',
  chainId: null
};

const props = defineProps<{
  open: boolean;
  networkId: NetworkID;
  initialState?: SpaceMetadataTreasury;
}>();
const emit = defineEmits<{
  (e: 'add', config: SpaceMetadataTreasury);
  (e: 'close'): void;
}>();

const showPicker = ref(false);
const searchValue = ref('');
const form: Ref<SpaceMetadataTreasury> = ref(clone(DEFAULT_FORM_STATE));

const definition = computed(() => {
  return {
    type: 'object',
    title: 'Space',
    additionalProperties: true,
    required: ['name', 'chainId', 'address'],
    properties: {
      name: {
        type: 'string',
        title: 'Name',
        minLength: 1,
        maxLength: 32,
        examples: ['Treasury name']
      },
      chainId: {
        type: ['string', 'number', 'null'],
        format: 'network',
        networkId: props.networkId,
        networksListKind: 'full',
        title: 'Treasury network',
        nullable: true
      },
      ...(form.value.chainId !== null
        ? {
            address: {
              type: 'string',
              title: 'Treasury address',
              examples: ['0x0000…'],
              format: 'address',
              minLength: 1
            }
          }
        : {})
    }
  };
});

const formErrors = computed(() =>
  validateForm(definition.value, form.value, { skipEmptyOptionalFields: true })
);

const formValid = computed(() => {
  return (
    Object.keys(formErrors.value).length === 0 &&
    form.value.chainId !== null &&
    form.value.address !== ''
  );
});

async function handleSubmit() {
  emit('add', form.value);
}

watch(
  () => props.open,
  () => {
    if (props.initialState) {
      form.value = clone(props.initialState);
    } else {
      form.value = clone(DEFAULT_FORM_STATE);
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="'Add treasury'" />
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
            placeholder="Search name or paste address"
            class="flex-auto bg-transparent text-skin-link"
          />
        </div>
      </template>
    </template>
    <PickerContact
      v-if="showPicker"
      :loading="false"
      :search-value="searchValue"
      @pick="
        value => {
          form.address = value;
          showPicker = false;
        }
      "
    />
    <div v-else class="s-box p-4">
      <UiForm
        :model-value="form"
        :error="formErrors"
        :definition="definition"
        @pick="showPicker = true"
      />
    </div>
    <template #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit"
        >Confirm</UiButton
      >
    </template>
  </UiModal>
</template>
