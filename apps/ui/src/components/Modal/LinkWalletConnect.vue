<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { ChainId, NetworkID, SelectedStrategy } from '@/types';

const DEFAULT_FORM_STATE = {
  pairingCode: ''
};

const definition = {
  type: 'object',
  title: 'WalletConnectConnection',
  additionalProperties: false,
  required: ['pairingCode'],
  properties: {
    pairingCode: {
      type: 'string',
      title: 'Pairing code',
      minLength: 1,
      examples: [
        'wc:7a96b74baf1bb28beae7cbbf485e0dfc17ec3fc7d3f2eed9337ca2e7524e1d1d'
      ]
    }
  }
};

const props = defineProps<{
  open: boolean;
  address: string;
  network: ChainId;
  networkId: NetworkID;
  spaceKey: string;
  executionStrategy: SelectedStrategy | null;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const { transaction } = useWalletConnectTransaction();
const { loading, logged, proposal, connect, logout } = useWalletConnect(
  props.networkId,
  Number(props.network),
  props.address,
  props.spaceKey,
  props.executionStrategy
);

const step: Ref<'INIT' | 'APPROVE'> = ref('INIT');
const approveFn: Ref<((value: boolean) => void) | null> = ref(null);
const approving: Ref<boolean> = ref(false);

const form: {
  pairingCode: string;
} = reactive(clone(DEFAULT_FORM_STATE));

const formErrors = computed(() => {
  const errors = validateForm(definition, form);
  return errors;
});

async function approveCallback() {
  step.value = 'APPROVE';

  return new Promise<boolean>(resolve => {
    approveFn.value = resolve;
  });
}

async function handleSubmit() {
  await connect(form.pairingCode, approveCallback);
}

function handleApprove(approved: boolean) {
  approveFn.value?.(approved);

  if (approved) approving.value = true;
  else {
    form.pairingCode = '';
    step.value = 'INIT';
  }
}

watch(logged, () => {
  if (logged.value) {
    form.pairingCode = '';
    step.value = 'INIT';
  }
});

watch(loading, () => {
  if (!loading.value) {
    approving.value = false;
  }
});
</script>

<template>
  <UiModal :open="open && !transaction" @close="emit('close')">
    <template #header>
      <h3>Connect to apps</h3>
    </template>
    <div class="s-box p-4">
      <template v-if="logged && proposal">
        <div class="flex flex-col items-center">
          <img
            :src="proposal.proposer.metadata.icons[0]"
            class="w-[48px] mb-3"
          />
          <span class="text-center mb-2">
            <span class="font-medium text-skin-link">{{
              proposal.proposer.metadata.name
            }}</span>
            <span> is connected</span>
          </span>
          <span>You can start interacting with the app.</span>
        </div>
      </template>
      <UiForm
        v-else-if="step === 'INIT'"
        :model-value="form"
        :error="formErrors"
        :definition="definition"
      />
      <div
        v-else-if="step === 'APPROVE' && proposal"
        class="flex flex-col items-center"
      >
        <img :src="proposal.proposer.metadata.icons[0]" class="w-[48px] mb-3" />
        <span class="text-center mb-2">
          <span class="font-medium text-skin-link">{{
            proposal.proposer.metadata.name
          }}</span>
          <span> wants to connect</span>
        </span>
        <div class="text-[17px] font-medium text-skin-link">
          {{ proposal.proposer.metadata.url }}
        </div>
      </div>
    </div>
    <template #footer>
      <UiButton
        v-if="logged"
        class="w-full"
        @click="
          logout();
          step = 'INIT';
        "
      >
        Disconnect
      </UiButton>
      <UiButton
        v-else-if="step === 'INIT'"
        class="w-full"
        :loading="loading"
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        Confirm
      </UiButton>
      <div v-else-if="step === 'APPROVE' && approveFn" class="flex space-x-3">
        <UiButton class="w-full" @click="handleApprove(false)">Reject</UiButton>
        <UiButton
          :primary="true"
          :loading="approving"
          class="w-full"
          @click="handleApprove(true)"
        >
          Approve
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
