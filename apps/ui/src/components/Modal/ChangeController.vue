<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

const DEFAULT_FORM_STATE = {
  controller: ''
};

const props = defineProps<{
  open: boolean;
  initialState?: { controller: string };
}>();

const emit = defineEmits<{
  (e: 'save', value: string);
  (e: 'close');
}>();

const CONTROLLER_DEFINITION = {
  type: 'string',
  format: 'ens-or-address',
  title: 'Controller',
  examples: ['Address or ENS']
};

const formValidator = getValidator({
  $async: true,
  type: 'object',
  additionalProperties: false,
  required: ['controller'],
  properties: {
    controller: CONTROLLER_DEFINITION
  }
});

const form: {
  controller: string;
} = reactive(clone(DEFAULT_FORM_STATE));
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

  formErrors.value = await formValidator.validateAsync(form);
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
        :definition="CONTROLLER_DEFINITION"
        :error="formErrors.delegatee"
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
