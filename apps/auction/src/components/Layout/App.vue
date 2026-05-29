<script lang="ts" setup>
import { Connector } from '@/networks/types';

const route = useRoute();
const uiStore = useUiStore();
const {
  modalOpen,
  modalAccountOpen,
  modalAccountWithoutDismissOpen,
  resetAccountModal
} = useModal();
const { init, app } = useApp();
const { login, web3 } = useWeb3();

useGuestLoginFromUrl();

provide('web3', web3);

const scrollDisabled = computed(() => modalOpen.value || uiStore.sideMenuOpen);

const hasTopNav = computed(
  () => route.matched[0]?.name !== 'auction-verify-standalone'
);

async function handleLogin(connector: Connector) {
  resetAccountModal();
  await login(connector);
}

onMounted(async () => {
  uiStore.restorePendingTransactions();
  await init();
});

watch(scrollDisabled, val => {
  const el = document.body;
  el.classList[val ? 'add' : 'remove']('overflow-y-hidden');
});
</script>

<template>
  <div class="min-h-screen" :class="{ 'overflow-clip': scrollDisabled }">
    <UiLoading v-if="app.loading || !app.init" class="overlay big" />
    <div v-else class="flex min-h-screen maximum:border-r maximum:border-l">
      <AppTopnav :has-app-nav="false" :class="{ hidden: !hasTopNav }" />
      <main class="flex-auto w-full flex">
        <div class="flex-auto w-0" :class="{ 'mt-header-height': hasTopNav }">
          <router-view class="h-full pb-10" />
        </div>
      </main>
    </div>
    <AppNotifications />
    <ModalConfirmSafe
      v-if="uiStore.safeModal !== null"
      :open="uiStore.safeModal !== null"
      :type="uiStore.safeModal.type"
      :show-verifier-link="uiStore.safeModal.showVerifierLink"
      :messages="{
        title: 'Confirm proposal in Safe app',
        subtitle: 'Go back to Safe app to confirm your proposal'
      }"
      @close="uiStore.safeModal = null"
    />
    <ModalConnector
      :open="modalAccountOpen || modalAccountWithoutDismissOpen"
      :closeable="!modalAccountWithoutDismissOpen"
      @close="modalAccountOpen = false"
      @pick="handleLogin"
    />
  </div>
</template>
