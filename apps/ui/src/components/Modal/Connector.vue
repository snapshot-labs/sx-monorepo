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
const guestLoading = ref(false);
const formEl = ref<HTMLFormElement | null>(null);

watch(showGuest, value => {
  guestAddress.value = '';
  if (value) nextTick(() => formEl.value?.querySelector('input')?.focus());
});

function handleGuestLogin() {
  if (!guestAddress.value) return;

  guestLoading.value = true;

  const stop = watch(
    () => web3.value.authLoading,
    loading => {
      if (loading) return;
      stop();
      guestLoading.value = false;
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

function handleClose() {
  showGuest.value = false;
  emit('close');
}
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
    <div v-else class="m-4 space-y-2 flex flex-col">
      <Connectors
        :supported-connectors="supportedConnectors"
        @click="(connector: Connector) => emit('pick', connector)"
      />
      <UiButton class="w-full" @click="showGuest = true">
        <span class="flex-grow text-left">Log in as guest</span>
      </UiButton>
    </div>
    <template v-if="showGuest" #footer>
      <UiButton
        class="w-full"
        primary
        :loading="guestLoading"
        :disabled="!guestAddress"
        @click.prevent="handleGuestLogin"
      >
        Log in
      </UiButton>
    </template>
  </UiModal>
</template>
