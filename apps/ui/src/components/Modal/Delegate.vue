<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { Space, SpaceMetadataDelegation } from '@/types';

const DEFAULT_FORM_STATE = {
  delegatee: ''
};

const props = defineProps<{
  open: boolean;
  space: Space;
  delegation: SpaceMetadataDelegation;
  initialState?: any;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const DELEGATEE_DEFINITION = {
  type: 'string',
  format: 'ens-or-address',
  title: 'Delegatee',
  examples: ['Address or ENS']
};

const formValidator = getValidator({
  $async: true,
  type: 'object',
  additionalProperties: false,
  required: ['delegatee'],
  properties: {
    delegatee: DELEGATEE_DEFINITION
  }
});

const { delegate } = useActions();

const form: {
  delegatee: string;
} = reactive(clone(DEFAULT_FORM_STATE));
const formValidated = ref(false);
const showPicker = ref(false);
const searchValue = ref('');
const sending = ref(false);
const formErrors = ref({} as Record<string, any>);

async function handleSubmit() {
  if (!props.delegation.apiType || !props.delegation.contractAddress) {
    return;
  }

  sending.value = true;

  try {
    await delegate(
      props.space,
      props.delegation.contractNetwork,
      props.delegation.apiType,
      form.delegatee,
      `${props.delegation.contractNetwork}:${props.delegation.contractAddress}`,
      props.delegation.chainId ?? undefined
    );
    emit('close');
  } catch (e) {
    console.log('delegation failed', e);
  } finally {
    sending.value = false;
  }
}

watch(
  () => props.open,
  () => {
    if (props.initialState) {
      form.delegatee = props.initialState.delegatee;
    } else {
      form.delegatee = DEFAULT_FORM_STATE.delegatee;
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
      <h3>Delegate voting power</h3>
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
          form.delegatee = $event;
          showPicker = false;
        "
      />
    </template>
    <div v-else class="s-box p-4">
      <UiInputAddress
        v-model="form.delegatee"
        :definition="DELEGATEE_DEFINITION"
        :error="formErrors.delegatee"
        @pick="showPicker = true"
      />
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton
        class="w-full"
        :loading="sending"
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
