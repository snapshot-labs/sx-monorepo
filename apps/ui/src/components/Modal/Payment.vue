<script setup lang="ts">
import { TokenId, TOKENS } from '@/composables/usePayment';
import { BarcodePayload } from '@/composables/usePaymentFactory';
import { getStampUrl, getUrl } from '@/helpers/utils';
import { metadataNetwork } from '@/networks';
import { ChainId } from '@/types';

const NETWORK_IDS: ChainId[] = Object.keys(TOKENS);

defineProps<{
  open: boolean;
  amount: number;
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
const { networks } = useOffchainNetworksList(metadataNetwork);

const modalTransactionProgressOpen = ref(false);
const chainId = ref<ChainId>(Number(NETWORK_IDS[0]));
const tokenId = ref<TokenId>(Object.keys(TOKENS[NETWORK_IDS[0]])[0] as TokenId);

const availableNetworks = computed<
  {
    id: ChainId;
    name: string;
    avatar: string;
  }[]
>(() => {
  return NETWORK_IDS.map(id => {
    const network = networks.value.find(network => network.key === id);

    if (
      !network ||
      (metadataNetwork === 's' && 'testnet' in network && network.testnet)
    ) {
      return;
    }

    return {
      id: Number(id),
      name: network.name,
      avatar: network.logo
    };
  }).filter(n => !!n);
});

const token = computed(() => TOKENS[chainId.value][tokenId.value]);

function handleSubmit() {
  startPaymentProcess();

  emit('close');
  modalTransactionProgressOpen.value = true;
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
            v-for="network in availableNetworks"
            :key="network.id"
            type="button"
            :class="[{ 'bg-skin-active-bg': chainId === network.id }]"
            @click="chainId = network.id as ChainId"
          >
            <img
              :src="getUrl(network.avatar) ?? undefined"
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
            v-for="[id, asset] in Object.entries(TOKENS[NETWORK_IDS[0]])"
            :key="id"
            :class="[{ 'bg-skin-active-bg': tokenId === id }]"
            @click="tokenId = id as TokenId"
          >
            <img
              :src="getStampUrl('token', TOKENS[1][id].address, 20)"
              class="rounded-full bg-skin-border size-[20px]"
              :alt="asset.symbol"
            />
            {{ asset.symbol }}
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
              :src="getStampUrl('token', TOKENS[1][tokenId].address, 20)"
              class="rounded-full bg-skin-border size-[18px]"
              :alt="token.symbol"
            />
            {{ amount }} {{ token.symbol }}
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
