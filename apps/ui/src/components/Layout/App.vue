<script lang="ts" setup>
import resolveConfig from 'tailwindcss/resolveConfig';
import { Transaction } from '@/types';
import tailwindConfig from '../../../tailwind.config';

const LG_WIDTH = Number(
  resolveConfig(tailwindConfig).theme.screens.lg.replace('px', '')
);

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
const {
  spaceKey: walletConnectSpaceKey,
  network,
  executionStrategy,
  transaction,
  reset
} = useWalletConnectTransaction();

provide('web3', web3);

const scrollDisabled = computed(() => modalOpen.value || uiStore.sidebarOpen);

const hasAppNav = computed(
  () =>
    ['space', 'my', 'settings'].includes(String(route.matched[0]?.name)) &&
    !['space-editor', 'space-proposal'].includes(String(route.matched[1]?.name))
);

const hasPlaceHolderSidebar = computed(
  () =>
    !['space-proposal', 'create'].includes(String(route.matched[0]?.name)) &&
    !['space-editor', 'space-proposal'].includes(String(route.matched[1]?.name))
);

const bottomPadding = computed(
  () => !['space-proposal-votes'].includes(String(route.name))
);

async function handleTransactionAccept() {
  if (
    !walletConnectSpaceKey.value ||
    !executionStrategy.value ||
    !transaction.value
  )
    return;

  const executions = {} as Record<string, Transaction[]>;
  executions[executionStrategy.value.address] = [transaction.value];

  const spaceKey = walletConnectSpaceKey.value;
  const draftId = await createDraft(spaceKey, {
    executions
  });

  router.push({
    name: 'space-editor',
    params: { space: walletConnectSpaceKey.value, key: draftId }
  });

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
  if (window.innerWidth > LG_WIDTH) return;

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
    <div v-else :class="['flex min-h-screen', { 'pb-6': bottomPadding }]">
      <AppMenuMobile
        v-if="web3.account"
        :class="[
          `fixed bottom-0 inset-x-0 hidden app-mobile-menu z-[100]`,
          { 'app-mobile-menu-open': uiStore.sidebarOpen }
        ]"
        @navigated="uiStore.sidebarOpen = false"
      />
      <AppSidebar
        :class="[
          `hidden lg:flex app-sidebar fixed inset-y-0`,
          { '!flex app-sidebar-open': uiStore.sidebarOpen }
        ]"
        @navigated="uiStore.sidebarOpen = false"
      />
      <AppTopnav
        :has-app-nav="hasAppNav"
        @navigated="uiStore.sidebarOpen = false"
      >
        <template #toggle-sidebar-button>
          <button
            type="button"
            class="text-skin-link lg:hidden ml-4"
            @click="uiStore.toggleSidebar"
          >
            <IH-menu-alt-2 />
          </button>
        </template>
      </AppTopnav>
      <AppNav
        v-if="hasAppNav"
        :class="[
          'top-[72px] inset-y-0 z-10 hidden lg:block fixed app-nav',
          {
            '!block app-nav-open': uiStore.sidebarOpen
          }
        ]"
        @navigated="uiStore.sidebarOpen = false"
      />
      <button
        v-if="uiStore.sidebarOpen"
        type="button"
        class="backdrop"
        @click="uiStore.sidebarOpen = false"
      />
      <main class="flex-auto w-full flex">
        <div class="flex-auto w-0 mt-[72px]">
          <router-view />
        </div>
        <div
          v-if="hasPlaceHolderSidebar"
          class="app-placeholder-sidebar hidden xl:block"
        />
      </main>
    </div>
    <AppNotifications />
    <ModalTransaction
      v-if="route.name !== 'space-editor' && transaction && network"
      :open="!!transaction"
      :network="network"
      :initial-state="transaction._form"
      @add="handleTransactionAccept"
      @close="handleTransactionReject"
    />
  </div>
</template>

<style lang="scss" scoped>
$sidebarWidth: 72px;
$mobileMenuHeight: 72px;
$navWidth: 240px;
$placeholderSidebarWidth: 240px;

.app-sidebar {
  @apply w-[#{$sidebarWidth}];

  @media (max-width: 767px) {
    &-open {
      @apply bottom-[#{$mobileMenuHeight}];
    }
  }

  @media (max-width: 1011px) {
    &-open {
      & ~ :deep(*) {
        @apply translate-x-[#{$sidebarWidth}] z-0;

        .app-toolbar-bottom {
          @apply hidden;
        }
      }

      &:has(~ .app-nav) ~ .app-nav ~ :deep(*) {
        @apply translate-x-[#{$sidebarWidth + $navWidth}];
      }
    }
  }
}

.app-nav {
  @apply w-[#{$navWidth}];

  @media (max-width: 767px) {
    &-open {
      @apply bottom-[#{$mobileMenuHeight}];
    }
  }

  @media (max-width: 1011px) {
    &-open ~ :deep(*) {
      @apply translate-x-[#{$navWidth}];

      .app-toolbar-bottom {
        @apply hidden;
      }
    }
  }
}

.app-mobile-menu {
  height: $mobileMenuHeight;

  @media (max-width: 767px) {
    &-open {
      @apply grid;
    }
  }
}

.app-placeholder-sidebar {
  @apply w-[#{$placeholderSidebarWidth}];

  &::before {
    @apply block fixed border-l top-[72px] bottom-0 right-0 w-[#{$placeholderSidebarWidth}];

    content: '';
  }
}

@media (screen(xl)) {
  main > div:has(+ .app-placeholder-sidebar) :deep(.app-toolbar-bottom) {
    @apply right-[#{$placeholderSidebarWidth}];
  }
}

@media (screen(lg)) {
  .app-sidebar {
    & ~ :deep(main),
    & ~ .backdrop,
    & ~ :deep(header.fixed),
    & ~ :deep(main header.fixed),
    & ~ :deep(main .app-toolbar-bottom),
    & ~ :deep(.app-nav) {
      @apply ml-[#{$sidebarWidth}];
    }

    &:has(~ .app-nav) ~ .app-nav {
      & ~ :deep(main),
      & ~ .backdrop,
      & ~ :deep(header.fixed),
      & ~ :deep(main header.fixed),
      & ~ :deep(main .app-toolbar-bottom),
      & ~ :deep(.app-nav) {
        @apply ml-[#{$sidebarWidth + $navWidth}];
      }
    }
  }

  .app-nav ~ :deep(*) {
    @apply ml-[#{$navWidth}];
  }
}

.backdrop {
  @apply fixed inset-0 z-[99];
  @apply bg-[black]/40 #{!important};

  @media (max-width: 767px) {
    @apply bottom-[#{$mobileMenuHeight}];
  }
}
</style>
