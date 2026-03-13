<script setup lang="ts">
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

const showGuest = ref(false);
const guestAddress = ref('');
const isGuestLoading = ref(false);
const formEl = ref<HTMLFormElement | null>(null);

function handleGuestLogin() {
  if (!guestAddress.value) return;

  isGuestLoading.value = true;

  const stop = watch(
    () => web3.value.authLoading,
    loading => {
      if (loading) return;
      stop();
      isGuestLoading.value = false;
      if (web3.value.account) {
        showGuest.value = false;
        emit('close');
      }
    }
  );

  router.push({
    query: { ...router.currentRoute.value.query, as: guestAddress.value }
  });
}

function handleConnectorClick(connector: Connector) {
  if (connector.type === 'guest') {
    showGuest.value = true;
  } else {
    emit('pick', connector);
  }
}

function handleClose() {
  showGuest.value = false;
  emit('close');
}

watch(showGuest, value => {
  guestAddress.value = '';
  if (value) nextTick(() => formEl.value?.querySelector('input')?.focus());
});
</script>

<template>
  <UiModal :open="open" @close="handleClose">
    <template #header>
      <h3
        v-text="
          showGuest
            ? 'Log in as guest'
            : web3.account
              ? 'Change wallet'
              : 'Log in'
        "
      />
    </template>
    <form
      v-if="showGuest"
      ref="formEl"
      class="s-box p-4"
      @submit.prevent="handleGuestLogin"
    >
      <UiInputString
        v-model="guestAddress"
        :definition="{
          title: 'Guest account',
          examples: ['Address or ENS']
        }"
      />
    </form>
    <div v-else class="m-4">
      <Connectors
        :supported-connectors="supportedConnectors"
        @click="handleConnectorClick"
      />
    </div>
    <template v-if="showGuest" #footer>
      <UiButton
        class="w-full"
        primary
        :loading="isGuestLoading"
        :disabled="!guestAddress"
        @click.prevent="handleGuestLogin"
      >
        Log in
      </UiButton>
    </template>
  </UiModal>
</template>
