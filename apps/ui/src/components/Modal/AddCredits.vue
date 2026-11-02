<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { useQuery } from '@tanstack/vue-query';
import { normalize } from 'viem/ens';
import { getBalance } from '@/helpers/alchemy';
import { ETH_CONTRACT, SNAPSHOT_PLUS_FEES } from '@/helpers/constants';
import { _n, formatPlusUsage } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { getNetwork } from '@/networks';
import { Connector } from '@/networks/types';
import { ChainId, Space } from '@/types';

// The indexer stores deposits as a signed 64-bit amount of wei, about 9.2 ETH
const MAX_DEPOSIT = 9;
// Left in the wallet when depositing the max, to pay for gas
const GAS_RESERVE = 0.005;

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
// Mainnet credits can also be paid on Base
const paymentChainId = ref<string | number | null>(
  String(network.value.chainId)
);
const chainId = computed(
  () => Number(paymentChainId.value || network.value.chainId) as ChainId
);
const { payWithNativeToken } = usePayment(chainId);

const form = ref<{ amount: number | '' }>({ amount: '' });
const amount = ref('');
const isModalConnectorOpen = ref(false);
const isModalTransactionProgressOpen = ref(false);

// Only Ethereum wallets can send ETH
const connectors = computed(() =>
  network.value.managerConnectors.filter(
    connector => !['guest', 'argentx'].includes(connector)
  )
);

const isAuthValid = computed(
  () => !!auth.value && connectors.value.includes(auth.value.connector.type)
);

const account = computed(() => auth.value?.account);
const { data: walletBalance, isPending } = useQuery({
  queryKey: ['walletBalance', chainId, account],
  queryFn: async () =>
    Number(
      formatUnits(await getBalance(account.value!, String(chainId.value)))
    ),
  enabled: isAuthValid
});
const isBalancePending = computed(() => isAuthValid.value && isPending.value);
// What the wallet can deposit and still pay for gas
const maxAmount = computed(() => {
  if (walletBalance.value === undefined) return MAX_DEPOSIT;

  const max = Math.min(walletBalance.value - GAS_RESERVE, MAX_DEPOSIT);
  return Math.max(Math.floor(max * 1e6) / 1e6, 0);
});

const definition = computed(() => ({
  type: 'object',
  additionalProperties: false,
  required: ['amount'],
  properties: {
    amount: {
      type: 'number',
      title: 'Amount (ETH)',
      minimum: SNAPSHOT_PLUS_FEES.proposal,
      maximum: maxAmount.value,
      examples: ['0.1']
    }
  }
}));

const formErrors = computed(() =>
  getValidator(definition.value).validate(form.value, {
    skipEmptyOptionalFields: true
  })
);
const isInsufficientBalance = computed(
  () =>
    walletBalance.value !== undefined &&
    Number(form.value.amount) > maxAmount.value
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
  if (!form.value.amount || formErrors.value.amount) return '';

  const total = credits.value + Number(form.value.amount);
  const balance = _n(total, 'standard', { maximumFractionDigits: 4 });

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

function handleMaxClick() {
  form.value.amount = maxAmount.value;
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
      <UiSelectorNetwork
        v-if="space.network === 's'"
        v-model="paymentChainId"
        required
        :definition="{
          type: 'string',
          title: 'Network',
          networkId: space.network,
          networksListKind: 'full',
          networksFilter: ['1', '8453']
        }"
      />
      <div class="s-base">
        <div class="s-label" v-text="'Token'" />
        <div class="s-input h-[61px]">
          <div class="flex items-center gap-2">
            <UiStamp
              :id="`eip155:${chainId}:${ETH_CONTRACT}`"
              type="token"
              :size="20"
            />
            ETH
          </div>
        </div>
      </div>
      <div class="relative">
        <UiForm
          :model-value="form"
          :error="formErrors"
          :definition="definition"
          :loading="isBalancePending"
        />
        <button
          v-if="walletBalance !== undefined"
          type="button"
          class="absolute right-3 top-1 flex items-center gap-1"
          :class="{ 'text-skin-danger': isInsufficientBalance }"
          @click="handleMaxClick"
        >
          <IC-wallet class="size-[14px]" />
          {{ _n(walletBalance, 'standard', { maximumFractionDigits: 6 }) }}
        </button>
      </div>
      <div v-if="estimate" class="text-base mt-1" v-text="estimate" />
      <div v-else-if="credits < 0" class="text-base mt-1">
        {{ -credits }} ETH is owed. Add at least {{ minimumForPlus }} ETH to
        turn Plus on.
      </div>
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
        <template v-if="!isAuthValid">Log in</template>
        <template v-else-if="isInsufficientBalance">Insufficient ETH</template>
        <template v-else>Add credits</template>
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
