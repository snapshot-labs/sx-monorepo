<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { h, VNode } from 'vue';
import { splitDelegate } from '@/helpers/delegation';
import { _t, clone, getUrl } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import {
  EVM_CONNECTORS,
  STARKNET_CONNECTORS
} from '@/networks/common/constants';
import { METADATA as STARKNET_NETWORK_METADATA } from '@/networks/starknet';
import { Connector, ConnectorType } from '@/networks/types';
import { ChainId, Space, SpaceMetadataDelegation } from '@/types';

type Delegatee = {
  id: string;
  share: number;
};

const SUPPORTED_CHAIN_IDS = [1, 100];

const DEFAULT_FORM_STATE = {
  delegatees: [{ id: '', share: 0 }],
  selectedIndex: 0,
  expirationDate: 0,
  chainId: SUPPORTED_CHAIN_IDS[0]
};

const props = defineProps<{
  open: boolean;
  space: Space;
  delegation?: SpaceMetadataDelegation;
  initialState?: any;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const { delegate } = useActions();
const { auth, login } = useWeb3();

const form: {
  delegatees: Delegatee[];
  selectedIndex: number;
  expirationDate: number;
  chainId: ChainId;
} = reactive(clone(DEFAULT_FORM_STATE));
const formValidated = ref(false);
const showPicker = ref(false);
const pickerIndex = ref(0);
const searchValue = ref('');
const sending = ref(false);
const formErrors = ref({} as Record<string, any>);
const connectorModalOpen = ref(false);
const connectorModalConnectors = ref([] as ConnectorType[]);
const delegateesRef: Ref<any[]> = ref([]);
const sharesRef: Ref<any[]> = ref([]);
const isModalDateTimeOpen = ref(false);
const isHidden = ref(false);

const delegateAddressDefinition = computed(() => ({
  type: 'string',
  format:
    selectedDelegation.value?.apiType === 'split-delegation'
      ? 'address'
      : 'ens-or-address',
  chainId: selectedDelegation.value?.chainId ?? undefined,
  title: 'Delegatee',
  examples: [
    selectedDelegation.value?.apiType === 'split-delegation'
      ? 'Address'
      : 'Address or ENS'
  ]
}));

const delegateShareDefinition = computed(() => ({
  type: 'number',
  examples: ['10'],
  minimum: 0,
  maximum: 100,
  default: 0
}));

const delegateDefinition = computed(() => ({
  type: 'object',
  title: 'Delegatee',
  properties: {
    id: delegateAddressDefinition.value,
    share: delegateShareDefinition.value
  },
  required: ['id', 'share'],
  additionalProperties: true
}));

const expirationDateDefinition = computed(() => ({
  type: 'number',
  title: 'Expiration date',
  examples: ['Expiration date'],
  minimum: Date.now(),
  default: Date.now()
}));

const formValidator = computed(() =>
  getValidator({
    $async: true,
    type: 'object',
    additionalProperties: false,
    required: ['delegatees'],
    properties: {
      delegatees: {
        type: 'array',
        title: 'Delegates',
        minItems:
          selectedDelegation.value?.apiType === 'split-delegation' ? 0 : 1,
        maxItems:
          selectedDelegation.value?.apiType === 'split-delegation' ? 1000 : 1,
        items: [delegateDefinition.value]
      }
    }
  })
);

const isInvalidSelectedDelegation = computed(
  () => !isValidDelegation(selectedDelegation.value)
);

const selectedDelegation = computed<SpaceMetadataDelegation | undefined>(() => {
  return (
    props.delegation || validSelectableDelegations.value[form.selectedIndex]
  );
});

const validDelegations = computed(() => {
  return props.space.delegations.filter(isValidDelegation);
});

const validSelectableDelegations = computed(() => {
  return validDelegations.value.filter(delegation => {
    return auth.value ? isDelegationSupportedByUser(delegation) : true;
  });
});

const spaceDelegationsOptions = computed<
  { id: number; name: string; icon: VNode }[]
>(() => {
  return validSelectableDelegations.value.map((d, i) => {
    const network = getNetworkDetails(d.chainId as string);

    return {
      id: i,
      name: d.name || '',
      icon: h('img', {
        src: getUrl(network.logo),
        alt: network.name,
        class: 'rounded-full'
      })
    };
  });
});

const availableNetworks = computed(() => {
  return Object.entries(networks)
    .filter(([, network]) => {
      return SUPPORTED_CHAIN_IDS.includes(network.chainId);
    })
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

const isClearingDelegation = computed(() => {
  return props.initialState?.delegatees.length && form.delegatees.length === 0;
});

function delegationConnectors(
  delegation: SpaceMetadataDelegation
): ConnectorType[] {
  if (!delegation.chainId) return [];

  const starknetChainIds: ChainId[] = Object.values(
    STARKNET_NETWORK_METADATA
  ).map(network => network.chainId);

  return starknetChainIds.includes(delegation.chainId)
    ? STARKNET_CONNECTORS
    : EVM_CONNECTORS;
}

function isDelegationSupportedByUser(
  delegation?: SpaceMetadataDelegation
): boolean {
  if (!auth.value?.connector || !delegation?.chainId) return false;

  return delegationConnectors(delegation).includes(auth.value.connector.type);
}

function isValidDelegation(delegation?: SpaceMetadataDelegation): boolean {
  return !!(delegation?.chainId && delegation?.apiUrl && delegation?.apiType);
}

function getNetworkDetails(chainId: number | string) {
  if (typeof chainId === 'number') {
    return networks[chainId];
  }

  const starknetNetwork = Object.entries(STARKNET_NETWORK_METADATA).find(
    ([, { chainId: starknetChainId }]) => starknetChainId === chainId
  )?.[0];

  if (!starknetNetwork) {
    return { name: 'Unknown network', logo: '' };
  }

  return {
    name: STARKNET_NETWORK_METADATA[starknetNetwork].name,
    logo: STARKNET_NETWORK_METADATA[starknetNetwork].avatar
  };
}

async function handleSubmit() {
  if (
    !selectedDelegation.value ||
    (auth.value && !isDelegationSupportedByUser(selectedDelegation.value))
  )
    return;

  if (
    !selectedDelegation.value.apiType ||
    !selectedDelegation.value.contractAddress ||
    !selectedDelegation.value.chainId
  ) {
    return;
  }

  try {
    if (selectedDelegation.value.apiType === 'split-delegation') {
      splitDelegate(
        props.space,
        selectedDelegation.value.contractAddress,
        form.chainId,
        form.delegatees.map(delegatee => delegatee.id),
        form.delegatees.map(delegatee => delegatee.share),
        form.expirationDate
      );
    } else {
      await delegate(
        props.space,
        selectedDelegation.value.apiType,
        form.delegatees[0].id,
        selectedDelegation.value.contractAddress,
        selectedDelegation.value.chainId
      );
    }
    emit('close');
  } catch (e) {
    console.log('delegation failed', e);
  } finally {
    sending.value = false;
  }
}

function handleDatePick(date: number) {
  form.expirationDate = date * 1000;
  isModalDateTimeOpen.value = false;
  isHidden.value = false;
}

function handleWalletChangeClick() {
  emit('close');
  connectorModalConnectors.value = delegationConnectors(
    selectedDelegation.value || validDelegations.value[0]
  );
  connectorModalOpen.value = true;
}

function handleConnectorPick(connector: Connector) {
  connectorModalOpen.value = false;
  connectorModalConnectors.value = [];
  login(connector);
}

function handleAddDelegatee() {
  form.delegatees.push(clone(DEFAULT_FORM_STATE.delegatees[0]));
  nextTick(() => delegateesRef.value[form.delegatees.length - 1].focus());
}

const handleDistributeSharesEvenlyClick = () => {
  const share = Math.floor(100 / form.delegatees.length);
  form.delegatees.forEach(delegatee => {
    delegatee.share = share;
  });
};

const handleSharePressEnter = (index: number) => {
  if (!form.delegatees[index + 1]) return handleAddDelegatee();

  nextTick(() => delegateesRef.value[index + 1].focus());
};

const handleAddressPressEnter = (index: number) => {
  nextTick(() => sharesRef.value[index].focus());
};

const handleAddressPressDelete = (index: number, force = false) => {
  if (form.delegatees[index].id && !force) return;

  form.delegatees.splice(index, 1);
  nextTick(() => delegateesRef.value[index - 1].focus());
};

watch(
  () => props.open,
  () => {
    const defaultExpirationDate = new Date();
    defaultExpirationDate.setFullYear(defaultExpirationDate.getFullYear() + 1);

    if (props.initialState) {
      form.delegatees = props.initialState.delegatees.length
        ? clone(props.initialState.delegatees)
        : clone(DEFAULT_FORM_STATE.delegatees);
      form.selectedIndex =
        props.initialState.selectedIndex || DEFAULT_FORM_STATE.selectedIndex;
      form.expirationDate =
        props.initialState.expirationDate || defaultExpirationDate.getTime();
      form.chainId = props.initialState.chainId || DEFAULT_FORM_STATE.chainId;
    } else {
      form.delegatees = clone(DEFAULT_FORM_STATE.delegatees);
      form.selectedIndex = DEFAULT_FORM_STATE.selectedIndex;
      form.expirationDate = defaultExpirationDate.getTime();
      form.chainId = DEFAULT_FORM_STATE.chainId;
    }
  }
);

watchEffect(async () => {
  formValidated.value = false;

  formErrors.value = await formValidator.value.validateAsync(form);

  if (
    form.delegatees
      .map(delegatee => delegatee.share)
      .reduce((a, b) => a + b, 0) > 100
  ) {
    formErrors.value.global = 'Shares must add up to 100%';
  }

  const nonEmptyAddresses = form.delegatees.map(d => d.id).filter(Boolean);
  if (new Set(nonEmptyAddresses).size !== nonEmptyAddresses.length) {
    formErrors.value.global = 'Duplicate addresses are not allowed';
  }

  formValidated.value = true;
});
</script>

<template>
  <UiModal :open="open" :class="{ hidden: isHidden }" @close="$emit('close')">
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
          form.delegatees[pickerIndex].id = $event;
          showPicker = false;
        "
      />
    </template>
    <UiMessage
      v-else-if="auth && !isDelegationSupportedByUser(selectedDelegation)"
      class="m-4"
      type="danger"
    >
      Please connect with
      {{ auth.connector.type === 'argentx' ? 'an EVM' : 'a Starknet' }} wallet.
    </UiMessage>
    <UiMessage
      v-else-if="isInvalidSelectedDelegation"
      class="m-4"
      type="danger"
    >
      Invalid delegation
    </UiMessage>
    <div v-else class="s-box p-4">
      <Combobox
        v-if="!delegation && validSelectableDelegations.length > 1"
        v-model="form.selectedIndex"
        :definition="{
          type: ['number'],
          title: 'Delegation scheme',
          examples: ['Select delegation scheme'],
          enum: spaceDelegationsOptions.map(d => d.id),
          options: spaceDelegationsOptions
        }"
      />
      <div v-if="delegation?.apiType === 'split-delegation'" class="space-y-4">
        <div>
          <div class="flex justify-between">
            <h4 class="eyebrow">Delegates</h4>
            <div class="flex space-x-2">
              <UiTooltip title="Distribute shares evenly">
                <UiButton
                  class="!p-0 !border-0 !h-[auto] !bg-transparent"
                  @click="handleDistributeSharesEvenlyClick"
                >
                  <IH-bars-3 class="text-skin-text" />
                </UiButton>
              </UiTooltip>
              <UiTooltip title="Clear all delegates">
                <UiButton class="!p-0 !border-0 !h-[auto] !bg-transparent">
                  <IH-archive-box-x-mark
                    class="text-skin-text"
                    @click="form.delegatees.splice(0, form.delegatees.length)"
                  />
                </UiButton>
              </UiTooltip>
            </div>
          </div>
          <div class="mb-2.5 leading-5">
            Delegate your voting power to multiple addresses. Any unallocated
            power (100% - any delegations) will remain with you.
          </div>

          <div class="space-y-3">
            <UiAlert v-if="formErrors.global" type="error">
              {{ formErrors.global }}
            </UiAlert>
            <div class="space-y-2">
              <UiMessage v-if="isClearingDelegation" type="info">
                All delegates removed
              </UiMessage>
              <div
                v-for="(delegatee, index) in form.delegatees"
                :key="index"
                class="space-x-2"
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
                      :placeholder="delegateAddressDefinition.examples?.[0]"
                      type="text"
                      class="w-full bg-transparent h-[40px] py-[10px] text-skin-heading"
                      @keyup.enter="handleAddressPressEnter(index)"
                      @keydown.delete="handleAddressPressDelete(index)"
                    />
                    <button
                      type="button"
                      @click="
                        pickerIndex = index;
                        showPicker = true;
                      "
                    >
                      <IH-identification />
                    </button>
                  </div>
                  <div
                    class="shrink-0 w-[80px] rounded-lg bg-skin-border flex items-center px-2.5 gap-1 border"
                    :class="{
                      'border-skin-danger':
                        formErrors.delegatees?.[index]?.share
                    }"
                  >
                    <input
                      :ref="el => (sharesRef[index] = el)"
                      v-model.trim="delegatee.share"
                      type="number"
                      :definition="delegateShareDefinition"
                      class="w-full bg-transparent h-[40px] text-skin-heading text-right !p-0 !m-0"
                      @keyup.enter="handleSharePressEnter(index)"
                    />
                    %
                  </div>
                  <UiButton
                    class="!border-0 !h-[40px] !w-[20px] !px-0 !text-skin-text shrink-0"
                    @click="handleAddressPressDelete(index, true)"
                  >
                    <IH-trash />
                  </UiButton>
                </div>
                <span
                  v-if="formErrors.delegatees?.[index]"
                  class="text-skin-danger"
                  >{{
                    formErrors.delegatees?.[index]?.id ||
                    formErrors.delegatees?.[index]?.share
                  }}</span
                >
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
            class="flex items-center gap-2"
            @click="
              isModalDateTimeOpen = true;
              isHidden = true;
            "
          >
            {{ _t(form.expirationDate / 1000) }}
            <IH-pencil class="size-[16px]" />
          </button>
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
          <Combobox
            v-model="form.chainId"
            :definition="{
              type: 'number',
              title: 'Network',
              tooltip: '',
              examples: ['Select network'],
              enum: availableNetworks.map(c => c.id),
              options: availableNetworks
            }"
          />
        </div>
      </div>
      <template v-else>
        <UiInputAddress
          v-model="form.delegatees[0].id"
          :definition="delegateAddressDefinition"
          :error="formErrors.delegatees?.[0]?.id"
          :required="true"
          @pick="showPicker = true"
        />
      </template>
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton
        v-if="auth && !isDelegationSupportedByUser(selectedDelegation)"
        class="w-full"
        @click="handleWalletChangeClick"
      >
        Change wallet
      </UiButton>
      <UiButton
        v-else-if="isInvalidSelectedDelegation"
        class="w-full"
        @click="emit('close')"
      >
        Close
      </UiButton>
      <UiButton
        v-else
        primary
        class="w-full"
        :loading="sending"
        :disabled="
          Object.keys(formErrors).length > 0 ||
          (!!auth && !isDelegationSupportedByUser(selectedDelegation))
        "
        @click="handleSubmit"
      >
        {{ isClearingDelegation ? 'Clear delegates' : 'Confirm' }}
      </UiButton>
    </template>
  </UiModal>
  <ModalConnector
    :open="connectorModalOpen"
    :supported-connectors="connectorModalConnectors"
    @close="connectorModalOpen = false"
    @pick="handleConnectorPick"
  />
  <ModalDateTime
    :min="expirationDateDefinition.minimum / 1000"
    :selected="form.expirationDate / 1000"
    :open="isModalDateTimeOpen"
    @pick="handleDatePick"
    @close="
      isModalDateTimeOpen = false;
      isHidden = false;
    "
  />
</template>
