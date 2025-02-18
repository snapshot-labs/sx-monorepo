<script setup lang="ts">
import { TokenId } from '@/composables/usePayment';
import { ChainId } from '@/types';

const NETWORKS = {
  1: 'Ethereum',
  11155111: 'Sepolia',
  8453: 'Base'
};

const TOKENS: Record<TokenId, string> = {
  USDC: 'USDC',
  USDT: 'USDT'
};

const props = defineProps<{
  open: boolean;
  id: string;
  amount: number;
  product: string;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const { createSteps, goToNextStep, isLastStep, currentStep } =
  usePaymentFactory();

const modalTransactionProgressOpen = ref(false);
const chainId = ref<ChainId>(11155111);
const tokenId = ref<TokenId>('USDC');

async function handleSubmit() {
  await createSteps({
    chainId: chainId.value,
    tokenId: tokenId.value,
    amount: props.amount,
    id: props.id,
    type: props.product
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
      <div class="flex gap-2.5">
        <UiButton
          v-for="[networkId, name] in Object.entries(NETWORKS)"
          :key="networkId"
          :class="{
            'border-skin-heading': Number(chainId) === Number(networkId)
          }"
          @click="chainId = networkId"
        >
          {{ name }}
        </UiButton>
      </div>
      <h4>Currency</h4>
      <div class="flex gap-2.5">
        <UiButton
          v-for="(token, i) in Object.keys(TOKENS) as TokenId[]"
          :key="i"
          :class="{ 'border-skin-heading': tokenId === token }"
          @click="tokenId = token"
        >
          {{ TOKENS[token] }}
        </UiButton>
      </div>

      You will pay {{ amount }}
    </div>
    <template #footer>
      <UiButton class="w-full" primary @click="handleSubmit">Pay</UiButton>
    </template>
  </UiModal>
  <ModalTransactionProgress
    :open="modalTransactionProgressOpen"
    :execute="currentStep.execute"
    :chain-id="chainId"
    :messages="{
      approveTitle: currentStep.approveTitle,
      approveSubtitle: currentStep.approveSubtitle,
      failTitle: currentStep.failTitle,
      failSubtitle: currentStep.failSubtitle
    }"
    @close="modalTransactionProgressOpen = false"
    @confirmed="moveToNextStep"
  />
</template>
