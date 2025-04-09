<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { h, VNode } from 'vue';
import { clone, getUrl } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import {
  EVM_CONNECTORS,
  STARKNET_CONNECTORS
} from '@/networks/common/constants';
import { METADATA as STARKNET_NETWORK_METADATA } from '@/networks/starknet';
import { Connector, ConnectorType } from '@/networks/types';
import { ChainId, Space, SpaceMetadataDelegation } from '@/types';

const DEFAULT_FORM_STATE = {
  delegatee: '',
  selectedIndex: 0
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
  delegatee: string;
  selectedIndex: number;
} = reactive(clone(DEFAULT_FORM_STATE));
const formValidated = ref(false);
const showPicker = ref(false);
const searchValue = ref('');
const sending = ref(false);
const formErrors = ref({} as Record<string, any>);
const connectorModalOpen = ref(false);
const connectorModalConnectors = ref([] as ConnectorType[]);

const delegateDefinition = computed(() => ({
  type: 'string',
  format: 'ens-or-address',
  chainId: selectedDelegation.value?.chainId ?? undefined,
  title: 'Delegatee',
  examples: ['Address or ENS']
}));

const formValidator = computed(() =>
  getValidator({
    $async: true,
    type: 'object',
    additionalProperties: false,
    required: ['delegatee'],
    properties: {
      delegatee: delegateDefinition.value
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
  return !!(
    delegation?.chainId &&
    delegation?.apiUrl &&
    delegation?.apiType !== 'split-delegation'
  );
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

  sending.value = true;

  try {
    await delegate(
      props.space,
      selectedDelegation.value.apiType,
      form.delegatee,
      selectedDelegation.value.contractAddress,
      selectedDelegation.value.chainId
    );
    emit('close');
  } catch (e) {
    console.log('delegation failed', e);
  } finally {
    sending.value = false;
  }
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

watch(
  () => props.open,
  () => {
    if (props.initialState) {
      form.delegatee = props.initialState.delegatee;
      form.selectedIndex =
        props.initialState.selectedIndex || DEFAULT_FORM_STATE.selectedIndex;
    } else {
      form.delegatee = DEFAULT_FORM_STATE.delegatee;
      form.selectedIndex = DEFAULT_FORM_STATE.selectedIndex;
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
      <UiInputAddress
        v-model="form.delegatee"
        :definition="delegateDefinition"
        :error="formErrors.delegatee"
        :required="true"
        @pick="showPicker = true"
      />
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
        Confirm
      </UiButton>
    </template>
  </UiModal>
  <ModalConnector
    :open="connectorModalOpen"
    :supported-connectors="connectorModalConnectors"
    @close="connectorModalOpen = false"
    @pick="handleConnectorPick"
  />
</template>
