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
      <AppSidebar
        :class="[
          `hidden lg:flex app-sidebar h-screen fixed inset-y-0`,
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
      <main class="flex-auto w-full">
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

<style lang="scss" scoped>
$sidebarWidth: 72px;
$navWidth: 240px;

.app-sidebar {
  width: $sidebarWidth;

  @media (max-width: 1011px) {
    &-open {
      & ~ :deep(*) {
        @apply translate-x-[#{$sidebarWidth}];

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
  width: $navWidth;

  @media (max-width: 1011px) {
    &-open ~ :deep(*) {
      @apply translate-x-[#{$navWidth}];

      .app-toolbar-bottom {
        @apply hidden;
      }
    }
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
}
</style>
