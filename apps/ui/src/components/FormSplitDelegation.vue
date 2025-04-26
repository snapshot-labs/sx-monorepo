<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { _t, clone, getUrl } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { useDelegateesQuery } from '@/queries/delegatees';
import { ChainId, Space, SpaceMetadataDelegation } from '@/types';

type Delegatee = {
  id: string;
  share?: number;
};

// Delegation supports both following chains:
// Ethereum (1), Gnosis (100)
const SUPPORTED_CHAIN_IDS: ChainId[] = [1, 100];

const DELEGATEE_ADDRESS_DEFINITION = {
  type: 'string',
  format: 'address',
  title: 'Delegatee',
  examples: ['Address']
};

const DELEGATEE_SHARE_DEFINITION = {
  type: 'number',
  examples: ['10'],
  minimum: 0,
  maximum: 100,
  default: 0
};

const expirationDateDefinition = {
  type: 'number',
  title: 'Expiration date',
  examples: ['Expiration date'],
  minimum: Date.now(),
  errorMessage: 'Must be in the future'
};

const DELEGATEE_DEFINITION = {
  type: 'object',
  title: 'Delegatee',
  properties: {
    id: {
      anyOf: [DELEGATEE_ADDRESS_DEFINITION, { const: '' }],
      errorMessage: 'Must be a valid checksum address'
    },
    share: DELEGATEE_SHARE_DEFINITION
  },
  required: ['id', 'share'],
  additionalProperties: false
};

const form = defineModel<{
  delegatees: Required<Delegatee>[];
  expirationDate: number;
  chainId: ChainId;
}>('form', {
  required: true
});
const isFormValidated = defineModel<boolean>('isFormValidated', {
  required: true
});
const isFormValid = defineModel<boolean>('isFormValid', {
  required: true
});
const isHidden = defineModel<boolean>('isHidden', {
  required: true
});

const props = defineProps<{
  space: Space;
  delegation: SpaceMetadataDelegation;
  account?: string;
}>();

const emit = defineEmits<{
  (e: 'pick', index: number): void;
}>();

const isModalDateTimeOpen = ref(false);
const delegateesRef: Ref<any[]> = ref([]);
const sharesRef: Ref<any[]> = ref([]);
const formErrors = ref({} as Record<string, any>);

const {
  data: delegatees,
  isPending: isPendingDelegatees,
  isError: isDelegateesError,
  refetch: fetchDelegatees
} = useDelegateesQuery(
  toRef(props, 'account'),
  toRef(props, 'space'),
  toRef(props, 'delegation')
);

const availableNetworks = computed(() => {
  return Object.entries(networks)
    .filter(([, network]) => SUPPORTED_CHAIN_IDS.includes(network.chainId))
    .map(([, network]) => ({
      id: network.chainId,
      name: network.name,
      icon: h('img', {
        src: getUrl(network.logo),
        alt: network.name,
        class: 'rounded-full'
      })
    }));
});

const networkDefinition = computed(() => {
  return {
    type: 'number',
    title: 'Network',
    tooltip: '',
    examples: ['Select network'],
    enum: availableNetworks.value.map(c => c.id),
    options: availableNetworks.value
  };
});

const formValidator = computed(() =>
  getValidator({
    $async: true,
    type: 'object',
    additionalProperties: false,
    required: ['delegatees', 'expirationDate', 'chainId'],
    properties: {
      delegatees: {
        type: 'array',
        title: 'Delegates',
        minItems: 0,
        items: DELEGATEE_DEFINITION
      },
      expirationDate: expirationDateDefinition,
      chainId: networkDefinition.value
    }
  })
);

const nonEmptyFormDelegatees = computed(() => {
  return form.value.delegatees.filter(delegatee => !!delegatee.id);
});

function openDateTimeModal() {
  isModalDateTimeOpen.value = true;
  isHidden.value = true;
}

function closeDateTimeModal() {
  isModalDateTimeOpen.value = false;
  isHidden.value = false;
}

function handleDatePick(date: number) {
  form.value.expirationDate = date * 1000;
  closeDateTimeModal();
}

const handleDistributeSharesEvenlyClick = () => {
  // Always use integer shares, any leftover will be delegated to self
  const evenShare = Math.floor(100 / nonEmptyFormDelegatees.value.length);
  form.value.delegatees.forEach(delegatee => {
    if (!delegatee.id) return;

    delegatee.share = evenShare;
  });
};

function handleAddDelegatee() {
  form.value.delegatees.push({
    id: '',
    share: 0
  });
  nextTick(() => delegateesRef.value[form.value.delegatees.length - 1].focus());
}

const handleSharePressEnter = (index: number) => {
  if (!form.value.delegatees[index + 1]) return handleAddDelegatee();

  nextTick(() => delegateesRef.value[index + 1].focus());
};

const handleAddressPressEnter = (index: number) => {
  nextTick(() => sharesRef.value[index].focus());
};

const handleAddressPressDelete = (index: number, force = false) => {
  if (form.value.delegatees[index].id && !force) return;

  form.value.delegatees.splice(index, 1);
  nextTick(() => delegateesRef.value[index - 1]?.focus());
};

function prefillExistingDelegatees() {
  if (!delegatees.value?.length) return;

  const remainingShares =
    100 - delegatees.value.reduce((a, b) => a + b.share, 0);
  const formDelegatees = form.value.delegatees.filter(
    delegatee => !delegatees.value.some(d => d.id === delegatee.id)
  );

  form.value.delegatees = [
    ...clone(delegatees.value),
    ...formDelegatees.map(delegatee => ({
      id: delegatee.id,
      share: remainingShares / formDelegatees.length
    }))
  ]
    .filter(d => d.id)
    .map(delegatee => ({
      id: delegatee.id,
      share: delegatee.share ?? 100
    }));
}

watchEffect(async () => {
  isFormValidated.value = false;
  formErrors.value = await formValidator.value.validateAsync(form.value);

  // Validate sum of all shares adds up to 100%
  if (
    nonEmptyFormDelegatees.value
      .map(delegatee => delegatee.share)
      .reduce((a, b) => a + b, 0) > 100
  ) {
    form.value.delegatees.forEach((delegatee, index) => {
      if (delegatee.id) {
        formErrors.value.delegatees ||= [];
        formErrors.value.delegatees[index] = {
          ...formErrors.value.delegatees[index],
          share: 'Total share must add up to 100%'
        };
      }
    });
  }

  // Validate no duplicate addresses
  const nonEmptyAddresses = nonEmptyFormDelegatees.value.map(d => d.id);
  if (new Set(nonEmptyAddresses).size !== nonEmptyAddresses.length) {
    form.value.delegatees.forEach((delegatee, index, self) => {
      if (index !== self.findIndex(d => d.id === delegatee.id)) {
        formErrors.value.delegatees ||= [];
        formErrors.value.delegatees[index] = {
          ...formErrors.value.delegatees[index],
          id: 'Duplicate address not allowed.'
        };
      }
    });
  }

  isFormValidated.value = true;
  isFormValid.value = Object.keys(formErrors.value).length === 0;
});

watch(delegatees, () => {
  prefillExistingDelegatees();
});

onMounted(() => {
  form.value.chainId = SUPPORTED_CHAIN_IDS.includes(form.value.chainId)
    ? form.value.chainId
    : SUPPORTED_CHAIN_IDS[0];

  const defaultExpirationDate = new Date();
  defaultExpirationDate.setFullYear(defaultExpirationDate.getFullYear() + 1);
  form.value.expirationDate ||= defaultExpirationDate.getTime();

  prefillExistingDelegatees();
});
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2.5">
      <div class="space-y-1">
        <div class="flex justify-between items-center">
          <h4 class="eyebrow">Delegates</h4>
          <div class="flex gap-2">
            <UiTooltip
              title="Distribute shares evenly"
              class="flex items-center"
            >
              <button
                type="button"
                :disabled="isPendingDelegatees"
                @click="handleDistributeSharesEvenlyClick"
              >
                <IH-bars-3 />
              </button>
            </UiTooltip>
            <UiTooltip title="Clear all delegates" class="flex items-center">
              <button
                type="button"
                :disabled="isPendingDelegatees"
                @click="form.delegatees.splice(0, form.delegatees.length)"
              >
                <IH-archive-box-x-mark />
              </button>
            </UiTooltip>
          </div>
        </div>
        <div class="leading-5 text-[16px]">
          Delegate your voting power to multiple addresses. Any unallocated
          power (100% - any delegations) will remain with you.
        </div>
      </div>
      <UiLoading v-if="isPendingDelegatees" class="inline-block" />
      <div v-else-if="isDelegateesError" class="space-y-3">
        <UiAlert type="error">
          Error loading delegates data. Please try again.
        </UiAlert>
        <UiButton
          type="button"
          class="flex w-full items-center gap-2 justify-center"
          @click="fetchDelegatees"
        >
          <IH-refresh />Retry
        </UiButton>
      </div>
      <div v-else class="space-y-3">
        <div class="space-y-2">
          <UiMessage v-if="!form.delegatees.length" type="info">
            All delegates removed
          </UiMessage>
          <div
            v-for="(delegatee, index) in form.delegatees"
            :key="index"
            class="space-y-1"
          >
            <div class="flex items-center gap-2">
              <div
                class="grow rounded-lg bg-skin-border px-2.5 border flex items-center gap-2"
                :class="{
                  'border-skin-danger': formErrors.delegatees?.[index]?.id
                }"
              >
                <input
                  :ref="el => (delegateesRef[index] = el)"
                  v-model.trim="delegatee.id"
                  :placeholder="DELEGATEE_ADDRESS_DEFINITION.examples?.[0]"
                  type="text"
                  class="w-full bg-transparent h-[40px] text-skin-heading"
                  @keyup.enter="handleAddressPressEnter(index)"
                  @keydown.delete="handleAddressPressDelete(index)"
                />
                <button
                  type="button"
                  class="shrink-0"
                  @click="emit('pick', index)"
                >
                  <IH-identification />
                </button>
              </div>
              <div
                class="shrink-0 w-[80px] rounded-lg bg-skin-border flex items-center px-2.5 gap-1 border"
                :class="{
                  'border-skin-danger': formErrors.delegatees?.[index]?.share
                }"
              >
                <input
                  :ref="el => (sharesRef[index] = el)"
                  v-model.trim="delegatee.share"
                  type="number"
                  :min="DELEGATEE_SHARE_DEFINITION.minimum"
                  :max="DELEGATEE_SHARE_DEFINITION.maximum"
                  :placeholder="DELEGATEE_SHARE_DEFINITION.examples?.[0]"
                  class="w-full bg-transparent h-[40px] text-skin-heading text-right"
                  @keyup.enter="handleSharePressEnter(index)"
                />
                %
              </div>
              <button
                type="button"
                class="w-[20px] shrink-0"
                @click="handleAddressPressDelete(index, true)"
              >
                <IH-trash />
              </button>
            </div>
            <div
              v-if="formErrors.delegatees?.[index]"
              class="text-skin-danger"
              v-text="
                formErrors.delegatees?.[index]?.id ||
                formErrors.delegatees?.[index]?.share
              "
            />
          </div>
        </div>
        <UiButton
          class="w-full flex items-center justify-center space-x-1"
          @click="handleAddDelegatee"
        >
          <IH-plus-sm />
          Add delegate
        </UiButton>
      </div>
    </div>

    <div class="space-y-1">
      <h4 class="eyebrow flex items-center gap-1">
        Expiration date
        <UiTooltip
          title="All delegations will be cleared after the expiration date"
          class="text-skin-text"
        >
          <IH-exclamation-circle />
        </UiTooltip>
      </h4>
      <button
        type="button"
        class="flex items-center gap-2"
        @click="openDateTimeModal"
      >
        {{ _t(form.expirationDate / 1000) }}
        <IH-pencil class="size-[16px]" />
      </button>
      <div
        v-if="formErrors.expirationDate"
        class="text-skin-danger"
        v-text="formErrors.expirationDate"
      />
    </div>

    <div class="space-y-2.5">
      <h4 class="eyebrow flex items-center gap-1">
        Delegation network
        <UiTooltip
          title="Voting power will be aggregated from all networks, regardless of the delegation network"
          class="text-skin-text"
        >
          <IH-exclamation-circle />
        </UiTooltip>
      </h4>
      <Combobox v-model="form.chainId" :definition="networkDefinition" />
    </div>
  </div>
  <teleport to="#modal">
    <ModalDateTime
      :min="expirationDateDefinition.minimum / 1000"
      :selected="form.expirationDate / 1000"
      :open="isModalDateTimeOpen"
      @pick="handleDatePick"
      @close="closeDateTimeModal"
    />
  </teleport>
</template>
