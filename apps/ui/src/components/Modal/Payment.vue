<script setup lang="ts">
import { TokenId, TOKENS } from '@/composables/usePayment';
import { BarcodePayload } from '@/composables/usePaymentFactory';
import { getStampUrl, getUrl } from '@/helpers/utils';
import { metadataNetwork } from '@/networks';
import { ChainId } from '@/types';

const NETWORK_IDS = Object.keys(TOKENS);

const props = defineProps<{
  open: boolean;
  amount: number;
  barcodePayload: BarcodePayload;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const { createSteps, goToNextStep, isLastStep, currentStep } =
  usePaymentFactory();

const modalTransactionProgressOpen = ref(false);
const chainId = ref<ChainId>(NETWORK_IDS[0]);
const tokenId = ref<TokenId>(Object.keys(TOKENS[NETWORK_IDS[0]])[0] as TokenId);

const availableNetworks = computed(() => {
  const { networks } = useOffchainNetworksList(metadataNetwork);

  return NETWORK_IDS.map(id => {
    const network = networks.value.find(network => network.key === id);

    if (!network) return;
    return {
      id,
      name: network.name,
      avatar: network.logo
    };
  }).filter(Boolean);
});

async function handleSubmit() {
  const token = TOKENS[chainId.value][tokenId.value];

  if (!token) {
    console.error('Invalid payment token');
    return;
  }

  await createSteps({
    token,
    amount: props.amount,
    barcodePayload: props.barcodePayload
  });

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
    <div class="p-4 flex flex-col gap-2.5">
      <h4>Network</h4>
      <div
        class="flex border rounded-full p-1 items-center leading-[22px] bg-skin-bg justify-stretch"
      >
        <button
          v-for="network in availableNetworks"
          :key="network.id"
          type="button"
          :class="[
            'w-full  justify-center rounded-full py-1 flex items-center px-2  gap-1 text-skin-link cursor-pointer',
            { 'bg-skin-active-bg': Number(chainId) === Number(network.id) }
          ]"
          @click="chainId = network.id as ChainId"
        >
          <img
            :src="getUrl(network.avatar) ?? undefined"
            class="size-[20px] rounded-lg"
          />
          {{ network.name }}
        </button>
      </div>
      <h4>Currency</h4>
      <div
        class="flex border rounded-full p-1 items-center leading-[22px] bg-skin-bg"
      >
        <button
          v-for="[id, asset] in Object.entries(TOKENS[NETWORK_IDS[0]])"
          :key="id"
          :class="[
            'w-full justify-center rounded-full py-1 flex items-center px-2  gap-1 text-skin-link cursor-pointer',
            { 'bg-skin-active-bg': tokenId === id }
          ]"
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
    <template #footer>
      <div class="border rounded-lg mb-4">You will pay {{ amount }}</div>
      <UiButton class="w-full" primary @click="handleSubmit">Pay</UiButton>
    </template>
  </UiModal>
  <ModalTransactionProgress
    :open="modalTransactionProgressOpen"
    :execute="currentStep.execute"
    :chain-id="chainId"
    :messages="currentStep.messages"
    @close="modalTransactionProgressOpen = false"
    @confirmed="moveToNextStep"
  />
</template>
