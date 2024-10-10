<script lang="ts" setup>
import resolveConfig from 'tailwindcss/resolveConfig';
import { APP_NAME } from '@/helpers/constants';
import {
  getCacheHash,
  getStampUrl,
  whiteLabelAwareParams
} from '@/helpers/utils';
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
const { init, setAppName, app } = useApp();
const { isWhiteLabel, space: whiteLabelSpace } = useWhiteLabel();
const { setFavicon } = useFavicon();
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

const scrollDisabled = computed(() => modalOpen.value || uiStore.sideMenuOpen);

const hasAppNav = computed(
  () =>
    ['space', 'my', 'settings'].includes(String(route.matched[0]?.name)) &&
    !['space-editor', 'space-proposal'].includes(String(route.matched[1]?.name))
);

const hasSidebar = computed(() => !isWhiteLabel.value);

const hasSwipeableContent = computed(() => hasSidebar.value || hasAppNav.value);

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
    params: whiteLabelAwareParams(isWhiteLabel.value, {
      space: walletConnectSpaceKey.value,
      key: draftId
    })
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

watch(isSwiping, () => {
  if (
    window.innerWidth > LG_WIDTH ||
    !hasSwipeableContent.value ||
    !sidebarSwipeEnabled.value ||
    !isSwiping.value ||
    modalOpen.value
  )
    return;

  if (
    (direction.value === 'right' && !uiStore.sideMenuOpen) ||
    (direction.value === 'left' && uiStore.sideMenuOpen)
  ) {
    uiStore.toggleSidebar();
  }
});

watch(
  isWhiteLabel,
  isWhiteLabel => {
    if (!isWhiteLabel) {
      setAppName(APP_NAME);
      return;
    }

    if (!whiteLabelSpace.value) return;

    const faviconUrl = getStampUrl(
      'space',
      `${whiteLabelSpace.value.network}:${whiteLabelSpace.value.id}`,
      16,
      getCacheHash(whiteLabelSpace.value.avatar)
    );
    setFavicon(faviconUrl);

    setAppName(whiteLabelSpace.value.name);
  },
  { immediate: true }
);

router.afterEach(() => {
  uiStore.sideMenuOpen = false;
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
      <AppBottomNav
        v-if="web3.account && !isWhiteLabel"
        :class="[
          `fixed bottom-0 inset-x-0 hidden app-bottom-nav z-[100]`,
          { 'app-bottom-nav-open': uiStore.sideMenuOpen }
        ]"
      />
      <AppSidebar
        v-if="hasSidebar"
        :class="[
          `hidden lg:flex app-sidebar fixed inset-y-0`,
          { '!flex app-sidebar-open': uiStore.sideMenuOpen }
        ]"
      />
      <AppTopnav :has-app-nav="hasAppNav">
        <template #toggle-sidebar-button>
          <button
            v-if="hasSwipeableContent"
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
            '!block app-nav-open': uiStore.sideMenuOpen
          }
        ]"
      />
      <button
        v-if="uiStore.sideMenuOpen"
        type="button"
        class="backdrop"
        @click="uiStore.sideMenuOpen = false"
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

  @media (max-width: 1011px) {
    &-open {
      & ~ :deep(*) {
        @apply translate-x-[#{$sidebarWidth}];

        .app-toolbar-bottom {
          @apply hidden;
        }
      }

      & ~ :deep(main) {
        @apply z-[51];
      }

      &:has(~ .app-nav) ~ .app-nav ~ :deep(*) {
        @apply translate-x-[#{$sidebarWidth + $navWidth}];
      }
    }
  }
}

.app-nav {
  @apply w-[#{$navWidth}];

  @media (max-width: 1011px) {
    &-open {
      & ~ :deep(*) {
        @apply translate-x-[#{$navWidth}];

        .app-toolbar-bottom {
          @apply hidden;
        }
      }

      & ~ :deep(main) {
        @apply z-[51];
      }
    }
  }
}

.app-bottom-nav {
  height: $mobileMenuHeight;

  @media (max-width: 767px) {
    &-open {
      @apply grid;

      & ~ .backdrop,
      & ~ .app-nav-open,
      & ~ .app-sidebar-open {
        @apply bottom-[#{$mobileMenuHeight}];
      }
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
}
</style>
