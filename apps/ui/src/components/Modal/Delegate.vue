<script setup lang="ts">
import { getAddress } from '@ethersproject/address';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { h, VNode } from 'vue';
import { DELEGATE_REGISTRY_STRATEGIES } from '@/helpers/constants';
import { clone, compareAddresses, getUrl } from '@/helpers/utils';
import {
  EVM_CONNECTORS,
  STARKNET_CONNECTORS
} from '@/networks/common/constants';
import { METADATA as STARKNET_NETWORK_METADATA } from '@/networks/starknet';
import { Connector, ConnectorType } from '@/networks/types';
import { useDelegateesQuery } from '@/queries/delegatees';
import { ChainId, Space, SpaceMetadataDelegation } from '@/types';
import FormBasicDelegation from '../FormBasicDelegation.vue';

type Delegatee = {
  id: string;
  share?: number;
};

type ValidSpaceMetadataDelegation = {
  [P in keyof SpaceMetadataDelegation]: NonNullable<SpaceMetadataDelegation[P]>;
};

const SPLIT_DELEGATION_SUPPORTED_CHAIN_IDS = [1, 100];
// chain ids from https://github.com/snapshot-labs/snapshot-subgraph
const DELEGATE_REGISTRY_SUPPORTED_CHAIN_IDS = [
  1, 42161, 8453, 84532, 81457, 56, 250, 100, 59144, 5000, 137, 10, 146,
  11155111
];

const DEFAULT_FORM_STATE = {
  delegatees: [{ id: '', share: 100 }],
  expirationDate: 0,
  chainId: 1
};

const props = defineProps<{
  open: boolean;
  space: Space;
  delegation?: SpaceMetadataDelegation;
  initialState: {
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
  chainId: ChainId;
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

const delegations = computed<ValidSpaceMetadataDelegation[]>(() => {
  return props.space.delegations.filter(
    isValidDelegation
  ) as ValidSpaceMetadataDelegation[];
});

const delegationsSupportedByCurrentWallet = computed(() => {
  return delegations.value.filter(isDelegationSupportedByConnectedWallet);
});

const selectedDelegation = computed<ValidSpaceMetadataDelegation | null>(() => {
  if (props.delegation) {
    return isValidDelegation(props.delegation)
      ? (props.delegation as ValidSpaceMetadataDelegation)
      : null;
  }

  return delegations.value[selectedDelegationIndex.value] || null;
});

const isSelectedDelegationSupportingMultipleDelegates = computed(() => {
  return selectedDelegation.value?.apiType === 'split-delegation';
});

const {
  data: delegatees,
  isPending: isPendingDelegatees,
  isError: isDelegateesError,
  refetch: fetchDelegatees
} = useDelegateesQuery(
  () => auth.value?.account || '',
  toRef(props, 'space'),
  () => selectedDelegation.value
);

const spaceDelegationsOptions = computed<
  { id: number; name: string; icon: VNode }[]
>(() => {
  return delegationsSupportedByCurrentWallet.value.map((d, i) => {
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

const chainIds = computed(() => {
  if (isSelectedDelegationSupportingMultipleDelegates.value) {
    return SPLIT_DELEGATION_SUPPORTED_CHAIN_IDS;
  } else {
    const delegateRegistryStrategies = props.space.strategies_params.filter(
      (_, index) =>
        DELEGATE_REGISTRY_STRATEGIES.includes(props.space.strategies[index])
    );

    if (!delegateRegistryStrategies.length) {
      return [form.chainId];
    }

    const chainIds = delegateRegistryStrategies
      .flatMap(params => {
        return [
          params.network,
          ...params.params?.strategies?.flatMap(p => [
            p.network,
            p.params?.network
          ])
        ];
      })
      .filter(Boolean)
      .map(Number)
      .filter(chainId =>
        DELEGATE_REGISTRY_SUPPORTED_CHAIN_IDS.includes(chainId)
      );

    return Array.from(new Set(chainIds));
  }
});

function delegationConnectors(
  delegation: ValidSpaceMetadataDelegation
): ConnectorType[] {
  const starknetChainIds: ChainId[] = Object.values(
    STARKNET_NETWORK_METADATA
  ).map(network => network.chainId);

  return starknetChainIds.includes(delegation.chainId)
    ? STARKNET_CONNECTORS
    : EVM_CONNECTORS;
}

function isDelegationSupportedByConnectedWallet(
  delegation: ValidSpaceMetadataDelegation | null
): boolean {
  if (!auth.value?.connector || !delegation) return false;

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
    !isDelegationSupportedByConnectedWallet(selectedDelegation.value)
  )
    return;

  try {
    isSending.value = true;

    const validFormDelegatees = form.delegatees.filter(
      delegatee => !!delegatee.id
    );

    const newDelegatees = validFormDelegatees.map(d => d.id);
    const newShares = validFormDelegatees.map(d => Math.floor(d.share));
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
        validFormDelegatees
          .filter(({ id }) => !compareAddresses(id, self))
          .map(({ share }) => Math.floor(share))
          .reduce((a, b) => a + b, 0);
      if (remainingShares > 0) {
        newShares.push(remainingShares);
        newDelegatees.push(self);
      }

      newShares.forEach((share, index) => {
        if (share === 0) {
          newShares.splice(index, 1);
          newDelegatees.splice(index, 1);
        }
      });

      newDelegatees.forEach((address, index) => {
        newDelegatees[index] = getAddress(address);
      });
    }

    await delegate(
      props.space,
      selectedDelegation.value.apiType,
      newDelegatees,
      selectedDelegation.value.contractAddress,
      form.chainId,
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

function prefillExistingDelegatees() {
  if (!delegatees.value?.length) return;

  if (
    !isSelectedDelegationSupportingMultipleDelegates.value &&
    form.delegatees[0].id
  ) {
    return;
  }

  const remainingShares =
    100 - delegatees.value.reduce((a, b) => a + b.share, 0);
  const formDelegatees = form.delegatees.filter(
    delegatee => !delegatees.value.some(d => d.id === delegatee.id)
  );

  form.delegatees = [
    ...formDelegatees.map(delegatee => ({
      id: delegatee.id,
      share: remainingShares / formDelegatees.length
    })),
    ...clone(delegatees.value)
  ]
    .filter(d => d.id)
    .map(delegatee => ({
      id: delegatee.id,
      share: delegatee.share ?? 100
    }));
}

function handleWalletChangeClick() {
  emit('close');
  connectorModalConnectors.value = delegationConnectors(
    selectedDelegation.value as ValidSpaceMetadataDelegation
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

watch(delegatees, () => {
  prefillExistingDelegatees();
});

watch(auth, () => {
  form.delegatees = clone(
    props.initialState?.delegatees || DEFAULT_FORM_STATE.delegatees
  ).map(delegatee => ({
    id: delegatee.id,
    share: delegatee.share ?? 100
  }));
  prefillExistingDelegatees();
});

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
    form.chainId = props.delegation?.chainId || DEFAULT_FORM_STATE.chainId;

    prefillExistingDelegatees();
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
    <UiMessage v-else-if="!auth" class="m-4" type="danger">
      Please login first
    </UiMessage>
    <UiMessage
      v-else-if="!isDelegationSupportedByConnectedWallet(selectedDelegation)"
      class="m-4"
      type="danger"
    >
      Please connect with
      {{ auth.connector.type === 'argentx' ? 'an EVM' : 'a Starknet' }} wallet.
    </UiMessage>
    <UiMessage v-else-if="!selectedDelegation" class="m-4" type="danger">
      Invalid delegation
    </UiMessage>
    <div v-else class="s-box p-4 space-y-[14px]">
      <Combobox
        v-if="!delegation && delegationsSupportedByCurrentWallet.length > 1"
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
      <template v-else>
        <FormSplitDelegation
          v-if="isSelectedDelegationSupportingMultipleDelegates"
          v-model:is-form-validated="isFormValidated"
          v-model:is-form-valid="isFormValid"
          v-model:form="form"
          v-model:is-hidden="isHidden"
          :chain-ids="chainIds"
          @pick="handlePickerClick"
        />
        <FormBasicDelegation
          v-else
          v-model:is-form-validated="isFormValidated"
          v-model:is-form-valid="isFormValid"
          v-model:form="form"
          :chain-ids="chainIds"
          @pick="handlePickerClick"
        />
      </template>
    </div>
    <template v-if="!isPickerShown && auth" #footer>
      <UiButton
        v-if="!isDelegationSupportedByConnectedWallet(selectedDelegation)"
        class="w-full"
        @click="handleWalletChangeClick"
      >
        Change wallet
      </UiButton>
      <UiButton
        v-else-if="!selectedDelegation"
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
        :disabled="isPendingDelegatees || !isFormValid || !isFormValidated"
        @click="handleSubmit"
      >
        {{ !form.delegatees.length ? 'Clear delegates' : 'Confirm' }}
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
