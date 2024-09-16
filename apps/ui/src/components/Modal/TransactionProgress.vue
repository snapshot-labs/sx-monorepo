<script setup lang="ts">
import { sleep } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const API_DELAY = 10000;

type Messages = {
  approveTitle?: string;
  approveSubtitle?: string;
  confirmingTitle?: string;
  confirmingSubtitle?: string;
  successTitle?: string;
  successSubtitle?: string;
  failTitle?: string;
  failSubtitle?: string;
};

const props = withDefaults(
  defineProps<{
    open: boolean;
    networkId: NetworkID;
    messages?: Messages;
    execute: () => Promise<string | null>;
  }>(),
  {
    messages: () => ({})
  }
);

const emit = defineEmits<{
  (e: 'confirmed', txId: string | null): void;
  (e: 'close'): void;
}>();

const step: Ref<'approve' | 'confirming' | 'success' | 'fail'> = ref('approve');
const txId: Ref<string | null> = ref(null);

const network = computed(() => getNetwork(props.networkId));
const text = computed(() => {
  if (step.value === 'approve') {
    return {
      title: props.messages.approveTitle || 'Confirm transaction',
      subtitle: props.messages.approveSubtitle || 'We need your signature'
    };
  }

  if (step.value === 'confirming') {
    return {
      title: props.messages.confirmingTitle || 'Confirming transaction',
      subtitle:
        props.messages.confirmingSubtitle || 'This can take a few minutes'
    };
  }

  if (step.value === 'success') {
    return {
      title: props.messages.successTitle || 'Transaction successful',
      subtitle: props.messages.successSubtitle || 'You can close this window'
    };
  }

  if (step.value === 'fail') {
    return {
      title: props.messages.failTitle || 'Transaction failed',
      subtitle:
        props.messages.failSubtitle || 'Something went wrong. Please try again.'
    };
  }

  throw new Error('Invalid step');
});

async function handleExecute() {
  step.value = 'approve';
  try {
    txId.value = await props.execute();

    if (txId.value) {
      step.value = 'confirming';
      await network.value.helpers.waitForTransaction(txId.value);
      await sleep(API_DELAY);
    }

    emit('confirmed', txId.value);
    step.value = 'success';
  } catch (e) {
    console.warn('Transaction failed', e);

    step.value = 'fail';
  }
}

watch(
  () => props.open,
  open => {
    if (open) handleExecute();
  }
);
</script>

<template>
  <UiModal :open="open" class="text-skin-heading" @close="$emit('close')">
    <div
      class="flex flex-col px-4 py-5 space-y-4 text-center items-center text-skin-text"
    >
      <div
        v-if="['approve', 'confirming'].includes(step)"
        class="bg-skin-border rounded-full p-[12px]"
      >
        <UiLoading :width="28" :height="28" />
      </div>

      <div
        v-if="step === 'success'"
        class="bg-skin-success rounded-full p-[12px]"
      >
        <IS-check :width="28" :height="28" class="text-skin-bg" />
      </div>
      <div v-if="step === 'fail'" class="bg-skin-danger rounded-full p-[12px]">
        <IS-x-mark :width="28" :height="28" class="text-skin-bg" />
      </div>
      <div class="flex flex-col space-y-1 leading-6">
        <h4
          class="font-semibold text-skin-heading text-lg"
          v-text="text.title"
        />
        <div v-text="text.subtitle" />
      </div>
    </div>
    <slot id="content" :step="step" :tx-id="txId" />
    <div
      class="p-4 flex items-center justify-center text-skin-text"
      :class="{
        'pt-2': step !== 'fail',
        'border-t': step === 'fail'
      }"
    >
      <div v-if="step === 'approve'" v-text="'Proceed in your wallet'" />
      <AppLink
        v-else-if="['confirming', 'success'].includes(step) && txId"
        :to="network.helpers.getExplorerUrl(txId, 'transaction')"
      >
        View on explorer
      </AppLink>
      <div
        v-else-if="step === 'fail'"
        class="w-full flex justify-between space-x-[10px]"
      >
        <UiButton class="w-full" @click="$emit('close')">Cancel</UiButton>
        <UiButton primary class="w-full" @click="handleExecute">
          Try again
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>
