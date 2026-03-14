<script setup lang="ts">
import { formatAddress } from '@/helpers/connectors/guest';
import { getAddresses } from '@/helpers/stamp';
import { Connector, ConnectorType } from '@/networks/types';

defineProps<{
  open: boolean;
  supportedConnectors?: ConnectorType[];
}>();
const emit = defineEmits<{
  (e: 'pick', connector: Connector): void;
  (e: 'close'): void;
}>();

const { web3 } = useWeb3();
const router = useRouter();

const isGuestFormVisible = ref(false);
const guestAddress = ref('');
const isGuestLoading = ref(false);
const guestError = ref('');

async function handleGuestLogin() {
  if (!guestAddress.value) return;

  const value = guestAddress.value;

  if (value.includes('.')) {
    isGuestLoading.value = true;
    guestError.value = '';
    const resolved = await getAddresses([value], 1);
    isGuestLoading.value = false;

    if (!resolved[value]) {
      guestError.value = 'Could not resolve ENS name';
      return;
    }
  } else {
    try {
      formatAddress(value);
    } catch {
      guestError.value = 'Enter a valid address or ENS name';
      return;
    }
  }

  router.push({
    query: { ...router.currentRoute.value.query, as: value }
  });
  isGuestFormVisible.value = false;
  emit('close');
}

function handleConnectorClick(connector: Connector) {
  if (connector.type === 'guest') {
    isGuestFormVisible.value = true;
  } else {
    emit('pick', connector);
  }
}

function handleClose() {
  isGuestFormVisible.value = false;
  emit('close');
}

watch(isGuestFormVisible, () => {
  guestAddress.value = '';
  guestError.value = '';
});
</script>

<template>
  <UiModal :open="open" @close="handleClose">
    <template #header>
      <h3
        v-text="
          isGuestFormVisible
            ? 'Log in as guest'
            : web3.account
              ? 'Change wallet'
              : 'Log in'
        "
      />
    </template>
    <div v-if="isGuestFormVisible" class="s-box p-4">
      <UiInputString
        v-model="guestAddress"
        autofocus
        :error="guestError"
        :definition="{
          title: 'Guest account',
          examples: ['Address or ENS']
        }"
        @keydown.enter="handleGuestLogin"
      />
    </div>
    <div v-else class="m-4">
      <Connectors
        :supported-connectors="supportedConnectors"
        @click="handleConnectorClick"
      />
    </div>
    <template v-if="isGuestFormVisible" #footer>
      <UiButton
        class="w-full"
        primary
        :loading="isGuestLoading"
        :disabled="!guestAddress"
        @click="handleGuestLogin"
      >
        Log in
      </UiButton>
    </template>
  </UiModal>
</template>
