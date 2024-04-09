<script setup lang="ts">
import { startIntercom } from './helpers/intercom';

const el = ref(null);

const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();
const { modalOpen } = useModal();
const { init, app } = useApp();
const { web3 } = useWeb3();
const { isSwiping, direction } = useSwipe(el);
const { createDraft } = useEditor();
const { spaceKey, network, executionStrategy, transaction, reset } = useWalletConnectTransaction();

provide('web3', web3);

const scrollDisabled = computed(() => modalOpen.value || uiStore.sidebarOpen);

function handleTransactionAccept() {
  if (!spaceKey.value || !executionStrategy.value || !transaction.value) return;

  const draftId = createDraft(spaceKey.value, {
    execution: [transaction.value],
    executionStrategy: executionStrategy.value
  });
  router.push(`/${spaceKey.value}/create/${draftId}`);

  reset();
}

function handleTransactionReject() {
  reset();
}

onMounted(async () => {
  startIntercom();
  uiStore.restorePendingTransactions();
  await init();
});

watch(scrollDisabled, val => {
  const el = document.body;
  el.classList[val ? 'add' : 'remove']('overflow-hidden');
});

watch(route, () => {
  uiStore.sidebarOpen = false;
});

watch(isSwiping, () => {
  if (
    isSwiping.value &&
    !modalOpen.value &&
    ((direction.value === 'right' && !uiStore.sidebarOpen) ||
      (direction.value === 'left' && uiStore.sidebarOpen))
  ) {
    uiStore.toggleSidebar();
  }
});
</script>

<template>
  <div ref="el" :class="{ 'overflow-hidden': scrollDisabled }">
    <UiLoading v-if="app.loading || !app.init" class="overlay big" />
    <div v-else class="pb-6 flex">
      <AppSidebar class="lg:visible" :class="{ invisible: !uiStore.sidebarOpen }" />
      <AppTopnav />
      <AppNav />
      <div
        v-if="uiStore.sidebarOpen"
        class="backdrop lg:hidden"
        :style="{
          left: `${72 + (route.matched[0]?.name === 'space' ? 240 : 0)}px`
        }"
        @click="uiStore.toggleSidebar"
      />
      <div
        class="flex-auto w-full"
        :class="{
          'translate-x-[72px] lg:translate-x-0': uiStore.sidebarOpen
        }"
      >
        <router-view class="flex-auto mt-[72px] ml-0 lg:ml-[72px]" />
      </div>
    </div>
    <AppNotifications />
    <ModalTransaction
      v-if="route.name !== 'editor' && transaction && network"
      :open="!!transaction"
      :network="network"
      :initial-state="transaction._form"
      @add="handleTransactionAccept"
      @close="handleTransactionReject"
    />
  </div>
</template>

<style>
.backdrop {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
  background: rgba(0, 0, 0, 0.4);
}
</style>
