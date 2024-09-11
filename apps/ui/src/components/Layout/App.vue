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

const hasSidebar = computed(() => !app.value.isWhiteLabel);

const isSwippable = computed(() => hasSidebar.value || hasAppNav.value);

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
        v-if="hasSidebar"
        :class="[
          `hidden lg:flex app-sidebar h-screen fixed inset-y-0`,
          { '!flex app-sidebar-open': uiStore.sidebarOpen }
        ]"
      />
      <AppTopnav class="fixed top-0 inset-x-0 z-50">
        <template v-if="isSwippable" #toggle-sidebar-button>
          <button
            type="button"
            class="text-skin-link cursor-pointer lg:hidden ml-4"
            @click="uiStore.toggleSidebar"
          >
            <IH-menu-alt-2 />
          </button>
        </template>
      </AppTopnav>
      <AppNav
        :class="[
          'top-[72px] inset-y-0 z-10 hidden lg:block fixed app-nav',
          {
            '!block app-nav-open': uiStore.sidebarOpen
          }
        ]"
      />
      <button
        v-if="isSwippable && uiStore.sidebarOpen"
        type="button"
        class="backdrop lg:hidden"
        @click="uiStore.toggleSidebar"
      />
      <main class="flex-auto size-full">
        <router-view class="flex-auto mt-[72px]" />
      </main>
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
$sidebarWidth: 72px;
$navWidth: 240px;

.app-sidebar {
  width: $sidebarWidth;

  &-open {
    & ~ * {
      @apply translate-x-[#{$sidebarWidth}];
    }

    &:has(~ .app-nav) ~ .app-nav ~ * {
      @apply translate-x-[#{$sidebarWidth + $navWidth}];
    }
  }
}

.app-nav {
  width: $navWidth;

  &-open ~ * {
    @apply translate-x-[#{$navWidth}];
  }
}

@media (min-width: 1012px) {
  .app-sidebar {
    ~ * header,
    ~ header,
    & ~ .app-nav,
    & ~ main {
      @apply ml-[#{$sidebarWidth}];
      @apply translate-x-0 #{!important};
    }

    &:has(~ .app-nav) ~ .app-nav ~ * {
      @apply ml-[#{$sidebarWidth + $navWidth}];
    }
  }

  .app-nav ~ * {
    @apply ml-[#{$navWidth}];
    @apply translate-x-0 #{!important};
  }
}

.backdrop {
  @apply fixed inset-0 z-[99];
  @apply bg-[black]/40 #{!important};
}
</style>
