<script lang="ts">
type ValidationDetails = {
  key:
    | 'any-voting'
    | 'any-proposal'
    | 'basic'
    | 'passport-gated'
    | 'arbitrum'
    | 'karma-eas-attestation';
  schema: Record<string, any> | null;
  proposalValidationOnly?: boolean;
};

const validations = ref([] as ValidationDetails[]);
</script>

<script setup lang="ts">
import { VALIDATION_TYPES_INFO } from '@/helpers/constants';
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { Validation } from '@/types';

const props = defineProps<{
  open: boolean;
  type: 'voting' | 'proposal';
  current?: Validation;
}>();

const emit = defineEmits<{
  (e: 'save', type: Validation);
  (e: 'close');
}>();

const isLoading = ref(false);
const hasError = ref(false);
const selectedValidation = ref(null as ValidationDetails | null);
const form = ref({} as Record<string, any>);
const rawParams = ref('{}');

async function fetchValidations() {
  if (isLoading.value || validations.value.length) return;

  isLoading.value = true;
  hasError.value = false;

  try {
    const response = await fetch('https://score.snapshot.org/api/validations');
    validations.value = Object.values(await response.json());
  } catch (e) {
    console.log('failed to load validations', e);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
}

const filteredValidations = computed(() => {
  const apiValidations = validations.value.filter(validation => {
    if (props.type === 'proposal') return true;

    // TODO: add support for basic
    if (validation.key === 'basic') return false;

    return !validation.proposalValidationOnly;
  });

  return [
    {
      key:
        props.type === 'proposal'
          ? ('any-proposal' as const)
          : ('any-voting' as const),
      schema: null
    },
    ...apiValidations
  ];
});

const definition = computed(() => {
  if (!selectedValidation.value) return null;

  const current =
    selectedValidation.value.schema?.definitions?.Validation ?? null;

  if (!current) return null;

  const updated = clone(current);
  for (const key in updated.properties) {
    if (updated.properties[key].description) {
      updated.properties[key].tooltip = updated.properties[key].description;
      delete updated.properties[key].description;
    }

    if (updated.properties[key].anyOf) {
      updated.properties[key].enum = updated.properties[key].anyOf.map(
        item => item.const
      );
      updated.properties[key].options = updated.properties[key].anyOf.map(
        item => ({
          id: item.const,
          name: item.title
        })
      );
      delete updated.properties[key].anyOf;
    }

    if (updated.properties[key].items?.anyOf) {
      updated.properties[key].items.enum = updated.properties[
        key
      ].items.anyOf.map(item => item.const);
      updated.properties[key].options = updated.properties[key].items.anyOf.map(
        item => ({
          id: item.const,
          name: item.title
        })
      );
      delete updated.properties[key].items.anyOf;
    }
  }

  if (form.value.operator === 'NONE') {
    delete updated.properties.stamps;
  }

  return updated;
});

const formErrors = computed(() => {
  let errors = {} as Record<string | symbol, string>;

  if (!definition.value) {
    try {
      JSON.parse(rawParams.value);
      return {};
    } catch (e) {
      return { rawParams: 'Invalid JSON' };
    }
  }

  const validator = getValidator(definition.value);

  return {
    ...errors,
    ...validator.validate(form.value, {
      skipEmptyOptionalFields: true
    })
  };
});

function handleSelect(validationDetails: ValidationDetails) {
  if (['any-voting', 'any-proposal'].includes(validationDetails.key)) {
    emit('save', { name: 'any', params: {} });
    emit('close');
    return;
  }

  selectedValidation.value = validationDetails;
  if (selectedValidation.value.key === 'passport-gated') {
    form.value.scoreThreshold ??= 0;
    form.value.operator ??= 'NONE';
    form.value.stamps ??= [];
  }
}

function handleApply() {
  if (!selectedValidation.value) return;

  const params = definition.value ? form.value : JSON.parse(rawParams.value);
  emit('save', { name: selectedValidation.value.key, params });
  emit('close');
}

watch(
  () => props.open,
  value => {
    if (value) {
      selectedValidation.value = null;
      fetchValidations();

      if (props.current) {
        form.value = clone(props.current.params);
        rawParams.value = JSON.stringify(props.current.params, null, 2);
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>
        <template v-if="selectedValidation">Configure validation</template>
        <template v-else>Select validation</template>
      </h3>
    </template>
    <div class="p-4 flex flex-col gap-2.5">
      <UiLoading v-if="isLoading" class="m-auto" />
      <div
        v-else-if="hasError"
        class="flex w-full justify-center items-center gap-2 text-skin-text"
      >
        <IH-exclamation-circle class="inline-block shrink-0" />
        <span>Failed to load strategies.</span>
      </div>
      <div v-else-if="selectedValidation" class="s-box">
        <UiForm
          v-if="definition"
          v-model="form"
          :error="formErrors"
          :definition="definition"
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
      <UiSelector
        v-for="validation in filteredValidations"
        v-else
        :key="validation.key"
        :is-active="current?.name === validation.key"
        @click="handleSelect(validation)"
      >
        <div class="w-full">
          <div class="flex items-center gap-1 overflow-hidden">
            <h4
              class="text-skin-link truncate"
              v-text="VALIDATION_TYPES_INFO[validation.key].label"
            />
            <span
              v-if="validation.key === 'passport-gated'"
              class="bg-skin-text text-skin-accent-foreground rounded-full px-1.5 py-0.5 text-[13px] leading-[13px] h-fit"
            >
              Beta
            </span>
          </div>
          <div v-text="VALIDATION_TYPES_INFO[validation.key].description" />
        </div>
      </UiSelector>
    </div>
    <template v-if="selectedValidation" #footer>
      <UiButton
        class="w-full"
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleApply"
      >
        Apply changes
      </UiButton>
    </template>
  </UiModal>
</template>
