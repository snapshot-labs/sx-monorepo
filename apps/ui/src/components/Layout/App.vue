<script lang="ts" setup>
import { Transaction } from '@/types';

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
        :class="[
          `hidden lg:flex sidebar h-screen w-[72px] fixed inset-y-0`,
          { '!flex sidebar-open': uiStore.sidebarOpen }
        ]"
      />
      <AppTopnav class="fixed top-0 inset-x-0 z-50 lg:left-[72px]" />
      <AppNav
        class="top-[72px] inset-y-0 z-10 lg:block fixed lg:left-[72px] app-nav"
        :class="{
          hidden: !uiStore.sidebarOpen,
          'app-nav-open': uiStore.sidebarOpen
        }"
      />
      <button
        v-if="uiStore.sidebarOpen"
        type="button"
        class="backdrop lg:hidden"
        @click="uiStore.toggleSidebar"
      />
      <div
        class="flex-auto size-full lg:ml-[72px]"
        :class="{ 'lg:ml-[312px]': hasAppNav }"
      >
        <router-view class="flex-auto mt-[72px]" />
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

<style lang="scss">
.sidebar-open {
  ~ * {
    @apply translate-x-[72px];
  }

  & + .backdrop {
    left: 72px;
  }
}

.app-nav-open {
  ~ * {
    @apply ml-[240px];
  }
}

@media (min-width: 1012px) {
  .sidebar-open {
    ~ *,
    ~ * header {
      @apply translate-x-0;
    }
  }

  .sidebar ~ * header {
    @apply left-[72px];
  }

  .app-nav + * {
    @apply ml-[240px];
  }
}

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
