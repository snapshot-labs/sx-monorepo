<script setup lang="ts">
import { Token } from '@/composables/usePayment';
import { BarcodePayload } from '@/composables/usePaymentFactory';
import { _n, getUrl, uniqBy } from '@/helpers/utils';
import { metadataNetwork } from '@/networks';
import { ChainId } from '@/types';

const props = defineProps<{
  open: boolean;
  amount: number;
  tokens: Token[];
  barcodePayload: BarcodePayload;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const {
  start: startPaymentProcess,
  goToNextStep,
  isLastStep,
  currentStep
} = usePaymentFactory();
const { networks: allNetworks } = useOffchainNetworksList(metadataNetwork);

const modalTransactionProgressOpen = ref(false);
const token = ref<Token>(props.tokens[0]);
const chainId = ref<ChainId>(Number(token.value.chainId));

const networks = computed<
  {
    chainId: ChainId;
    name: string;
    avatar: string;
  }[]
>(() => {
  return uniqBy(props.tokens, 'chainId')
    .map(t => {
      const network = allNetworks.value.find(n => Number(n.key) === t.chainId);

      if (!network) {
        return;
      }

      return {
        chainId: Number(t.chainId),
        name: network.name,
        avatar: network.logo
      };
    })
    .filter(n => !!n);
});

const currentChainIdTokens = computed(() => {
  return props.tokens.filter(t => t.chainId === chainId.value);
});

function handleSubmit() {
  startPaymentProcess();

  emit('close');
  modalTransactionProgressOpen.value = true;
}

function handleChainIdClick(id: ChainId) {
  if (chainId.value === id) return;

  chainId.value = id;
  token.value = currentChainIdTokens.value[0];
}

function handleTokenClick(t: Token) {
  token.value = t;
}

async function moveToNextStep() {
  if (isLastStep.value) return;

  modalTransactionProgressOpen.value = false;

  if (await goToNextStep()) {
    modalTransactionProgressOpen.value = true;
  }
}
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Payment</h3>
    </template>
    <div class="p-4 space-y-3">
      <div class="space-y-1.5">
        <div>Network</div>
        <div class="pill-switcher">
          <button
            v-for="network in networks"
            :key="network.chainId"
            type="button"
            :class="[{ 'bg-skin-active-bg': chainId === network.chainId }]"
            @click="handleChainIdClick(network.chainId)"
          >
            <img
              :src="getUrl(network.avatar) || undefined"
              :alt="network.name"
              class="size-[20px] rounded-lg shrink-0"
            />
            {{ network.name }}
          </button>
        </div>
      </div>
      <div class="space-y-1.5">
        <div>Currency</div>
        <div class="pill-switcher">
          <button
            v-for="(t, i) in currentChainIdTokens"
            :key="i"
            type="button"
            :class="[{ 'bg-skin-active-bg': token.address === t.address }]"
            @click="handleTokenClick(t)"
          >
            <img
              :src="getUrl(t.logo) || undefined"
              class="rounded-full bg-skin-border size-[20px]"
              :alt="t.symbol"
            />
            {{ t.symbol }}
          </button>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="border rounded-lg mb-4 bg-skin-input-bg p-3 py-2.5">
        <div class="flex justify-between">
          You will pay
          <div class="flex items-center gap-1">
            <img
              :src="getUrl(token.logo) || undefined"
              class="rounded-full bg-skin-border size-[18px]"
              :alt="token.symbol"
            />
            {{ _n(amount) }} {{ token.symbol }}
          </div>
        </div>
      </div>
      <UiButton class="w-full" primary @click="handleSubmit">Pay</UiButton>
    </template>
  </UiModal>
  <ModalTransactionProgress
    :open="modalTransactionProgressOpen"
    :execute="() => currentStep.execute(token, amount, barcodePayload)"
    :chain-id="chainId"
    :messages="currentStep.messages"
    @close="modalTransactionProgressOpen = false"
    @confirmed="moveToNextStep"
  >
    <template #successTitle>
      <h4 class="font-semibold text-skin-heading text-lg">
        Upgraded to <ICPro class="w-[44px] inline" />
      </h4>
    </template>
    <template #successSubtitle>Thank you for your subscription!</template>
  </ModalTransactionProgress>
</template>

<style lang="scss" scoped>
.pill-switcher {
  @apply flex border rounded-full p-1 items-center leading-[22px] bg-skin-bg;

  button {
    @apply grow justify-center rounded-full py-1 flex items-center px-2 gap-1 text-skin-link;
  }
}
</style>
