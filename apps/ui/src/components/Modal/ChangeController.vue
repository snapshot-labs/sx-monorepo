<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { ChainId } from '@/types';

const DEFAULT_FORM_STATE = {
  controller: ''
};

const props = defineProps<{
  open: boolean;
  chainId: ChainId;
  initialState?: { controller: string };
}>();

const emit = defineEmits<{
  (e: 'save', value: string);
  (e: 'close');
}>();

const controllerDefinition = computed(() => ({
  type: 'string',
  format: 'ens-or-address',
  chainId: props.chainId,
  title: 'Controller',
  examples: ['Address or ENS']
}));

const formValidator = computed(() =>
  getValidator({
    $async: true,
    type: 'object',
    additionalProperties: false,
    required: ['controller'],
    properties: {
      controller: controllerDefinition.value
    }
  })
);

const form = reactive(clone(DEFAULT_FORM_STATE));
const formValidated = ref(false);
const showPicker = ref(false);
const searchValue = ref('');
const formErrors = ref({} as Record<string, any>);

watch(
  () => props.open,
  () => {
    if (props.initialState) {
      form.controller = props.initialState.controller;
    } else {
      form.controller = '';
    }
  }
);

watchEffect(async () => {
  formValidated.value = false;

  formErrors.value = await formValidator.value.validateAsync(form);
  formValidated.value = true;
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Change controller</h3>
      <template v-if="showPicker">
        <button
          type="button"
          class="absolute left-0 -top-1 p-4"
          @click="showPicker = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </button>
        <UiModalSearchInput
          v-model="searchValue"
          placeholder="Search name or paste address"
        />
      </template>
    </template>
    <template v-if="showPicker">
      <PickerContact
        :loading="false"
        :search-value="searchValue"
        @pick="
          form.controller = $event;
          showPicker = false;
        "
      />
    </template>
    <div v-else class="s-box p-4">
      <UiInputAddress
        v-model="form.controller"
        :definition="controllerDefinition"
        :error="formErrors.delegatee"
        :required="true"
        @pick="showPicker = true"
      />
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton
        class="w-full"
        :disabled="Object.keys(formErrors).length > 0"
        @click="emit('save', form.controller)"
      >
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
