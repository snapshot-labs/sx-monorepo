<script setup lang="ts">
import { startIntercom } from './helpers/intercom';
import { Transaction } from './types';

const el = ref(null);
const sidebarSwipeEnabled = ref(true);

const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();
const { modalOpen } = useModal();
const { init, app } = useApp();
const { web3 } = useWeb3();
const { isSwiping, direction } = useSwipe(el, {
  onSwipe(e: TouchEvent) {
    const noSideBarSwipe = (e.target as Element)?.closest(
      '[data-no-sidebar-swipe]'
    );
    sidebarSwipeEnabled.value =
      !noSideBarSwipe ||
      (noSideBarSwipe && noSideBarSwipe.getBoundingClientRect().x === 0);
  }
});
const { createDraft } = useEditor();
const { spaceKey, network, executionStrategy, transaction, reset } =
  useWalletConnectTransaction();

provide('web3', web3);

const scrollDisabled = computed(() => modalOpen.value || uiStore.sidebarOpen);

const isSiteRoute = computed(() => String(route.name).startsWith('site-'));

const hasAppNav = computed(() =>
  ['space', 'my', 'settings'].includes(String(route.matched[0]?.name))
);

const bottomPadding = computed(
  () => !['proposal-votes'].includes(String(route.name))
);

async function handleTransactionAccept() {
  if (!spaceKey.value || !executionStrategy.value || !transaction.value) return;

  const executions = {} as Record<string, Transaction[]>;
  executions[executionStrategy.value.address] = [transaction.value];

  const space = spaceKey.value;
  const draftId = await createDraft(space, {
    executions
  });

  router.push(`/${space}/create/${draftId}`);

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
  if (String(route.name).startsWith('site-') || window.innerWidth > 1012)
    return;

  if (
    sidebarSwipeEnabled.value &&
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
  <div
    ref="el"
    class="min-h-screen"
    :class="{ 'overflow-clip': scrollDisabled }"
  >
    <UiLoading v-if="app.loading || !app.init" class="overlay big" />
    <div v-else :class="['flex', { 'pb-6': bottomPadding }]">
      <AppSidebar
        v-if="!isSiteRoute"
        class="lg:visible"
        :class="{ invisible: !uiStore.sidebarOpen }"
      />
      <AppTopnav v-if="!isSiteRoute" />
      <AppNav v-if="!isSiteRoute" />
      <button
        v-if="!isSiteRoute && uiStore.sidebarOpen"
        type="button"
        class="backdrop"
        :style="{
          left: `${72 + (hasAppNav ? 240 : 0)}px`
        }"
        @click="uiStore.toggleSidebar"
      />
      <div
        class="flex-auto w-full"
        :class="{
          'translate-x-[72px] lg:translate-x-0': uiStore.sidebarOpen
        }"
      >
        <router-view
          class="flex-auto mt-[72px] pl-0 lg:pl-[72px]"
          :class="isSiteRoute && '!pl-0'"
        />
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
  background: rgba(0, 0, 0, 0.4) !important;
}
</style>
