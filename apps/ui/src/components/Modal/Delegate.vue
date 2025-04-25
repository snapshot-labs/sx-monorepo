<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { h, VNode } from 'vue';
import { clone, compareAddresses, getUrl } from '@/helpers/utils';
import {
  EVM_CONNECTORS,
  STARKNET_CONNECTORS
} from '@/networks/common/constants';
import { METADATA as STARKNET_NETWORK_METADATA } from '@/networks/starknet';
import { Connector, ConnectorType } from '@/networks/types';
import { ChainId, Space, SpaceMetadataDelegation } from '@/types';
import FormBasicDelegation from '../FormBasicDelegation.vue';

type Delegatee = {
  id: string;
  share?: number;
};

const DEFAULT_FORM_STATE = {
  delegatees: [{ id: '', share: 0 }],
  expirationDate: 0,
  chainId: null
};

const props = defineProps<{
  open: boolean;
  space: Space;
  delegation?: SpaceMetadataDelegation;
  initialState?: {
    delegatees: Delegatee[];
  };
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const { delegate } = useActions();
const { auth, login } = useWeb3();

const form: {
  delegatees: Required<Delegatee>[];
  expirationDate: number;
  chainId?: null | ChainId;
} = reactive(clone(DEFAULT_FORM_STATE));
const isFormValidated = ref(false);
const isFormValid = ref(false);
const isHidden = ref(false);
const isPickerShown = ref(false);
const isConnectorModalOpen = ref(false);
const isSending = ref(false);
const pickerIndex = ref(0);
const searchValue = ref('');
const connectorModalConnectors = ref([] as ConnectorType[]);
const selectedDelegationIndex = ref(0);

const validDelegations = computed<NonNullable<SpaceMetadataDelegation>[]>(
  () => {
    return props.space.delegations.filter(isValidDelegation);
  }
);

const validSelectableDelegations = computed(() => {
  if (!auth.value) return validDelegations.value;

  return validDelegations.value.filter(isDelegationSupportedByConnectedWallet);
});

const selectedDelegation = computed<SpaceMetadataDelegation>(() => {
  return (
    props.delegation ||
    validSelectableDelegations.value[selectedDelegationIndex.value]
  );
});

const selectedValidDelegation = computed(() => {
  return isValidDelegation(selectedDelegation.value)
    ? (selectedDelegation.value as NonNullable<SpaceMetadataDelegation>)
    : null;
});

const isInvalidSelectedDelegation = computed(
  () => !isValidDelegation(selectedDelegation.value)
);

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

const isClearingDelegation = computed(() => {
  return props.initialState?.delegatees.length && form.delegatees.length === 0;
});

const validFormDelegatees = computed(() => {
  return form.delegatees.filter(delegatee => !!delegatee.id);
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

function isDelegationSupportedByConnectedWallet(
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
    !auth.value ||
    !selectedDelegation.value ||
    (auth.value &&
      !isDelegationSupportedByConnectedWallet(selectedDelegation.value))
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
    const newDelegatees = validFormDelegatees.value.map(d => d.id);
    const newShares = validFormDelegatees.value.map(d => Math.floor(d.share));
    const self = auth.value.account;

    if (selectedDelegation.value.apiType === 'split-delegation') {
      const selfIndex = newDelegatees.findIndex(address =>
        compareAddresses(address, self)
      );
      if (selfIndex !== -1) {
        newDelegatees.splice(selfIndex, 1);
        newShares.splice(selfIndex, 1);
      }

      // Assign the remaining shares to self
      const remainingShares =
        100 -
        validFormDelegatees.value
          .filter(({ id }) => !compareAddresses(id, self))
          .map(({ share }) => Math.floor(share))
          .reduce((a, b) => a + b, 0);
      if (remainingShares > 0 && remainingShares < 100) {
        newShares.push(remainingShares);
        newDelegatees.push(self);
      }
    }

    await delegate(
      props.space,
      selectedDelegation.value.apiType,
      newDelegatees,
      selectedDelegation.value.contractAddress,
      form.chainId || selectedDelegation.value.chainId,
      {
        shares: newShares,
        expirationDate: form.expirationDate
      }
    );

    emit('close');
  } catch (e) {
    isSending.value = false;
    console.log('delegation failed', e);
  } finally {
  }
}

function handleWalletChangeClick() {
  emit('close');
  connectorModalConnectors.value = delegationConnectors(
    selectedDelegation.value || validDelegations.value[0]
  );
  isConnectorModalOpen.value = true;
}

function handleConnectorPick(connector: Connector) {
  isConnectorModalOpen.value = false;
  connectorModalConnectors.value = [];
  login(connector);
}

function handlePickerClick(index = 0) {
  pickerIndex.value = index;
  isPickerShown.value = true;
}

watch(
  () => props.open,
  () => {
    if (!props.open) return;

    form.delegatees = clone(
      props.initialState?.delegatees || DEFAULT_FORM_STATE.delegatees
    ).map(delegatee => ({
      id: delegatee.id,
      share: delegatee.share ?? 100
    }));
    form.expirationDate = DEFAULT_FORM_STATE.expirationDate;
  }
);
</script>

<template>
  <UiModal :open="open" :class="{ hidden: isHidden }" @close="$emit('close')">
    <template #header>
      <h3>Delegate voting power</h3>
      <template v-if="isPickerShown">
        <button
          type="button"
          class="absolute left-0 -top-1 p-4"
          @click="isPickerShown = false"
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
    <template v-if="isPickerShown">
      <PickerContact
        :loading="false"
        :search-value="searchValue"
        @pick="
          form.delegatees[pickerIndex].id = $event;
          isPickerShown = false;
        "
      />
    </template>
    <UiMessage
      v-else-if="
        auth && !isDelegationSupportedByConnectedWallet(selectedDelegation)
      "
      class="m-4"
      type="danger"
    >
      Please connect with
      {{ auth.connector.type === 'argentx' ? 'an EVM' : 'a Starknet' }} wallet.
    </UiMessage>
    <UiMessage v-else-if="!selectedValidDelegation" class="m-4" type="danger">
      Invalid delegation
    </UiMessage>
    <div v-else class="s-box p-4 space-y-[14px]">
      <Combobox
        v-if="!delegation && validSelectableDelegations.length > 1"
        v-model="selectedDelegationIndex"
        class="!mb-0"
        :definition="{
          type: ['number'],
          title: 'Delegation scheme',
          examples: ['Select delegation scheme'],
          enum: spaceDelegationsOptions.map(d => d.id),
          options: spaceDelegationsOptions
        }"
      />
      <FormSplitDelegation
        v-if="selectedValidDelegation.apiType === 'split-delegation'"
        v-model:is-form-validated="isFormValidated"
        v-model:is-form-valid="isFormValid"
        v-model:form="form"
        v-model:is-hidden="isHidden"
        :space="props.space"
        :delegation="selectedValidDelegation"
        :account="auth?.account"
        @pick="handlePickerClick"
      />
      <FormBasicDelegation
        v-else
        v-model:is-form-validated="isFormValidated"
        v-model:is-form-valid="isFormValid"
        v-model:delegatee="form.delegatees[0].id"
        :chain-id="selectedValidDelegation.chainId"
        @pick="handlePickerClick"
      />
    </div>
    <template v-if="!isPickerShown" #footer>
      <UiButton
        v-if="
          auth && !isDelegationSupportedByConnectedWallet(selectedDelegation)
        "
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
        :loading="isSending"
        primary
        class="w-full"
        :disabled="
          !isFormValid ||
          (!!auth &&
            !isDelegationSupportedByConnectedWallet(selectedDelegation))
        "
        @click="handleSubmit"
      >
        {{ isClearingDelegation ? 'Clear delegates' : 'Confirm' }}
      </UiButton>
    </template>
  </UiModal>
  <teleport to="#modal">
    <ModalConnector
      :open="isConnectorModalOpen"
      :supported-connectors="connectorModalConnectors"
      @close="isConnectorModalOpen = false"
      @pick="handleConnectorPick"
    />
  </teleport>
</template>
