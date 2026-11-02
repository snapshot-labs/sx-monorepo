<script setup lang="ts">
import { normalize } from 'viem/ens';
import { SNAPSHOT_PLUS_FEES } from '@/helpers/constants';
import { _n, formatPlusUsage } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { getNetwork } from '@/networks';
import { Connector } from '@/networks/types';
import { ChainId, Space } from '@/types';

// The indexer stores deposits as a signed 64-bit amount of wei, about 9.2 ETH
const MAX_DEPOSIT = 9;

const props = defineProps<{
  open: boolean;
  space: Space;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { auth, login } = useWeb3();
const uiStore = useUiStore();

const network = computed(() => getNetwork(props.space.network));
const chainId = computed(() => Number(network.value.chainId) as ChainId);
const { payWithNativeToken } = usePayment(chainId);

const form = ref<{ amount: number | '' }>({ amount: '' });
const amount = ref('');
const isModalConnectorOpen = ref(false);
const isModalTransactionProgressOpen = ref(false);

const definition = {
  type: 'object',
  additionalProperties: false,
  required: ['amount'],
  properties: {
    amount: {
      type: 'number',
      title: 'Amount (ETH)',
      minimum: SNAPSHOT_PLUS_FEES.proposal,
      maximum: MAX_DEPOSIT,
      examples: ['0.1']
    }
  }
};

const formErrors = computed(() =>
  getValidator(definition).validate(form.value, {
    skipEmptyOptionalFields: true
  })
);

// Only Ethereum wallets can send ETH
const connectors = computed(() =>
  network.value.managerConnectors.filter(
    connector => !['guest', 'argentx'].includes(connector)
  )
);

const isAuthValid = computed(
  () => !!auth.value && connectors.value.includes(auth.value.connector.type)
);

// The indexer only credits ids that follow ENS normalization, any other id
// would lose the deposit
const isSpaceSupported = computed(() => {
  try {
    const { id } = props.space;
    return normalize(id) === id && [...id].length <= 64;
  } catch {
    return false;
  }
});

// An owed balance is paid back first
const credits = computed(() => props.space.credits ?? 0);
const estimate = computed(() => {
  if (!form.value.amount) return '';

  const total = credits.value + Number(form.value.amount);
  const balance = _n(total, 'standard', { maximumFractionDigits: 6 });

  return `New balance ${balance} ETH ${formatPlusUsage(total)}`;
});
const minimumForPlus = computed(() =>
  Number((SNAPSHOT_PLUS_FEES.proposal - credits.value).toFixed(6))
);

async function deposit() {
  const tx = await payWithNativeToken(
    amount.value,
    `credits:${props.space.network}:${props.space.id}`
  );
  if (!tx) return null;

  uiStore.addPendingTransaction(tx.hash, chainId.value);
  return tx.hash;
}

async function handleConnectorPick(connector: Connector) {
  isModalConnectorOpen.value = false;
  await login(connector);
}

function handleSubmit() {
  if (!isAuthValid.value) {
    isModalConnectorOpen.value = true;
    return;
  }

  // Closed while the transaction runs, so it can't be sent twice
  amount.value = String(form.value.amount);
  emit('close');
  isModalTransactionProgressOpen.value = true;
}

watch(
  () => props.open,
  () => {
    form.value = { amount: '' };
  }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Add credits</h3>
    </template>
    <div v-if="isSpaceSupported" class="s-box p-4">
      <UiForm
        :model-value="form"
        :error="formErrors"
        :definition="definition"
      />
      <p v-if="estimate" class="text-sm" v-text="estimate" />
      <p v-else-if="credits < 0" class="text-sm">
        {{ -credits }} ETH is owed. Add at least {{ minimumForPlus }} ETH to
        turn Plus on.
      </p>
    </div>
    <UiStateWarning v-else class="p-4">
      This space id can't receive credits. Contact support to use Plus.
    </UiStateWarning>
    <template v-if="isSpaceSupported" #footer>
      <UiButton
        class="w-full primary"
        :disabled="isAuthValid && Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        {{ isAuthValid ? 'Add credits' : 'Log in' }}
      </UiButton>
    </template>
  </UiModal>
  <teleport to="#modal">
    <ModalConnector
      :open="isModalConnectorOpen"
      :supported-connectors="connectors"
      @pick="handleConnectorPick"
      @close="isModalConnectorOpen = false"
    />
    <ModalTransactionProgress
      :open="isModalTransactionProgressOpen"
      :chain-id="chainId"
      :execute="deposit"
      :messages="{
        successTitle: 'Credits added',
        successSubtitle: 'They will show on the space within a minute'
      }"
      @close="isModalTransactionProgressOpen = false"
      @cancelled="isModalTransactionProgressOpen = false"
    />
  </teleport>
</template>
