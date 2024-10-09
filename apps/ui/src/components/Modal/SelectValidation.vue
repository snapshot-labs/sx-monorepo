<script lang="ts">
type ValidationDetails = {
  key:
    | 'any'
    | 'only-members'
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
import { StrategyConfig } from '@/networks/types';
import { ChainId, NetworkID, Space, Validation } from '@/types';

const SCORE_API_URL = 'https://score.snapshot.org/api/validations';
const STRATEGIES_WITHOUT_PARAMS: ValidationDetails['key'][] = [
  'any',
  'only-members'
];

const props = defineProps<{
  open: boolean;
  networkId: NetworkID;
  defaultChainId: ChainId;
  space: Space;
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
const customStrategies = ref([] as StrategyConfig[]);

async function fetchValidations() {
  if (isLoading.value || validations.value.length) return;

  isLoading.value = true;
  hasError.value = false;

  try {
    const response = await fetch(SCORE_API_URL);
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

    return !validation.proposalValidationOnly;
  });

  if (props.type === 'proposal') {
    return [
      {
        key: 'only-members' as const,
        schema: null
      },
      ...apiValidations
    ];
  }

  return [
    {
      key: 'any' as const,
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

  if (selectedValidation.value.key === 'basic') {
    updated.properties.minScore.examples = ['e.g. 1.23'];
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
  if (STRATEGIES_WITHOUT_PARAMS.includes(validationDetails.key)) {
    emit('save', { name: validationDetails.key, params: {} });
    emit('close');
    return;
  }

  selectedValidation.value = validationDetails;
  if (selectedValidation.value.key !== props.current?.name) {
    form.value = {};
    rawParams.value = '{}';
  }

  if (selectedValidation.value.key === 'basic') {
    if (form.value.strategies) {
      customStrategies.value = form.value.strategies.map(strategy => ({
        id: crypto.randomUUID(),
        chainId: strategy.network,
        address: strategy.name,
        name: strategy.name,
        paramsDefinition: null,
        params: clone(strategy.params)
      }));
    }

    form.value.strategies ??= [];
  } else if (selectedValidation.value.key === 'passport-gated') {
    form.value.scoreThreshold ??= 0;
    form.value.operator ??= 'NONE';
    form.value.stamps ??= [];
  }
}

function handleApply() {
  if (!selectedValidation.value) return;

  const params = definition.value ? form.value : JSON.parse(rawParams.value);

  if (selectedValidation.value.key === 'basic') {
    if (customStrategies.value.length) {
      params.strategies = customStrategies.value.map(strategy => ({
        name: strategy.name,
        network: strategy.chainId,
        params: strategy.params
      }));
    } else {
      delete params.strategies;
    }
  }

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
        <template v-if="selectedValidation.key === 'basic'">
          <div class="flex items-center gap-1 mb-2">
            <h4 class="eyebrow font-medium">Custom strategies</h4>
            <UiTooltip
              title="Calculate the score with a different configuration of Voting Strategies"
            >
              <IH-question-mark-circle class="shrink-0" />
            </UiTooltip>
          </div>
          <UiStrategiesConfiguratorOffchain
            v-model="customStrategies"
            class="mt-3"
            allow-duplicates
            :network-id="networkId"
            :default-chain-id="defaultChainId"
          >
            <template #empty>
              <div class="p-3 border border-dashed rounded-lg text-center">
                No custom strategies added, space voting strategies will be used
                to compute score.
              </div>
            </template>
          </UiStrategiesConfiguratorOffchain>
        </template>
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
              v-text="
                VALIDATION_TYPES_INFO[
                  validation.key === 'any' ? `any-${type}` : validation.key
                ].label
              "
            />
            <span
              v-if="validation.key === 'passport-gated'"
              class="bg-skin-text text-skin-accent-foreground rounded-full px-1.5 py-0.5 text-[13px] leading-[13px] h-fit"
            >
              Beta
            </span>
          </div>
          <div
            v-text="
              VALIDATION_TYPES_INFO[
                validation.key === 'any' ? `any-${type}` : validation.key
              ].description
            "
          />
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
