<script lang="ts" setup>
import resolveConfig from 'tailwindcss/resolveConfig';
import { APP_NAME } from '@/helpers/constants';
import {
  getCacheHash,
  getStampUrl,
  whiteLabelAwareParams
} from '@/helpers/utils';
import { Connector } from '@/networks/types';
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
const {
  modalOpen,
  modalAccountOpen,
  modalAccountWithoutDismissOpen,
  resetAccountModal
} = useModal();
const { init, setAppName, app } = useApp();
const { setSkin } = useSkin();
const { setTheme } = useTheme();
const { isStandaloneLayout } = useLayout();
const { isWhiteLabel, space: whiteLabelSpace, skinSettings } = useWhiteLabel();
const { setFavicon } = useFavicon();
const { space: currentSpace } = useCurrentSpace();
const { organization } = useOrganization();
const { login, web3 } = useWeb3();
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

const EDITOR_ROUTES = ['space-editor', 'org-editor'];
const PROPOSAL_ROUTES = ['space-proposal', 'org-proposal'];

const scrollDisabled = computed(() => modalOpen.value || uiStore.sideMenuOpen);

const { hasAppNav } = useNav();

const hasSidebar = computed(() => !isStandaloneLayout.value);

const hasSwipeableContent = computed(() => hasSidebar.value || hasAppNav.value);

const hasPlaceHolderSidebar = computed(
  () =>
    ![
      'create-space-snapshot',
      'create-space-snapshot-x',
      'auction',
      'auctions',
      'auction-invite',
      'auction-upcoming',
      'auction-verify-standalone'
    ].includes(String(route.matched[0]?.name)) &&
    ![...EDITOR_ROUTES, ...PROPOSAL_ROUTES].includes(
      String(route.matched[1]?.name)
    )
);

const hasTopNav = computed(() => {
  return !EDITOR_ROUTES.includes(String(route.matched[1]?.name));
});

async function handleLogin(connector: Connector) {
  resetAccountModal();
  await login(connector);
}

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
  el.classList[val ? 'add' : 'remove']('overflow-y-hidden');
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

const faviconSpace = computed(
  () => organization.value?.spaces[0] ?? currentSpace.value
);

watchEffect(() => {
  if (!faviconSpace.value) {
    setFavicon(null);
    return;
  }

  setFavicon(
    getStampUrl(
      'space',
      `${faviconSpace.value.network}:${faviconSpace.value.id}`,
      16,
      getCacheHash(faviconSpace.value.avatar)
    )
  );
});

watch(
  isWhiteLabel,
  isWhiteLabel => {
    if (!isWhiteLabel || !skinSettings.value) {
      setAppName(APP_NAME);
      return;
    }

    if (!whiteLabelSpace.value) return;

    setAppName(whiteLabelSpace.value.name);
    setTheme(skinSettings.value.theme);
    setSkin(skinSettings.value);
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
    <div
      v-else
      class="flex min-h-screen maximum:border-r"
      :class="{ 'maximum:border-l': isStandaloneLayout }"
    >
      <AppBottomNav
        v-if="web3.account && !isStandaloneLayout"
        :class="[
          `fixed bottom-0 inset-x-0 hidden app-bottom-nav z-[100]`,
          { 'app-bottom-nav-open': uiStore.sideMenuOpen }
        ]"
      />
      <AppSidebar
        v-if="hasSidebar"
        :class="[
          `hidden lg:flex app-sidebar fixed inset-y-0 top-electron-titlebar-height`,
          { '!flex app-sidebar-open': uiStore.sideMenuOpen }
        ]"
      />
      <AppTopnav
        :has-app-nav="hasAppNav"
        :class="{ hidden: !hasTopNav, 'maximum:border-l': isStandaloneLayout }"
        class="maximum:border-r"
      >
        <template #toggle-sidebar-button>
          <button
            v-if="hasSwipeableContent"
            type="button"
            class="text-skin-link lg:hidden ml-4"
            :class="{ hidden: uiStore.sideMenuOpen }"
            @click="uiStore.toggleSidebar"
          >
            <IH-menu-alt-2 />
          </button>
        </template>
      </AppTopnav>
      <AppNav
        v-if="hasAppNav"
        :class="[
          'top-header-height inset-y-0 z-10 hidden lg:flex fixed app-nav',
          {
            '!flex app-nav-open': uiStore.sideMenuOpen
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
        <div class="flex-auto w-0" :class="{ 'mt-header-height': hasTopNav }">
          <router-view class="h-full pb-10" />
        </div>
        <div
          v-if="hasPlaceHolderSidebar"
          class="app-placeholder-sidebar hidden xl:block"
        />
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
    <ModalTransaction
      v-if="hasTopNav && transaction && network"
      :open="!!transaction"
      :network="network"
      :initial-state="transaction._form"
      @add="handleTransactionAccept"
      @close="handleTransactionReject"
    />
    <ModalConnector
      :open="modalAccountOpen || modalAccountWithoutDismissOpen"
      :closeable="!modalAccountWithoutDismissOpen"
      @close="modalAccountOpen = false"
      @pick="handleLogin"
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
    @apply block fixed border-l top-[72px] bottom-0 w-[#{$placeholderSidebarWidth}];

    content: '';
  }
}

@media (screen(lg)) {
  .app-sidebar {
    & ~ :deep(main),
    & ~ .backdrop,
    & ~ :deep(header.fixed > div),
    & ~ :deep(main header.fixed > div),
    & ~ :deep(.app-nav) {
      @apply ml-[#{$sidebarWidth}];
    }

    &:has(~ .app-nav) ~ .app-nav {
      & ~ :deep(main),
      & ~ .backdrop,
      & ~ :deep(header.fixed > div),
      & ~ :deep(main header.fixed > div),
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
  @apply fixed inset-0 top-electron-titlebar-height z-[99];
  @apply bg-[black]/40 #{!important};
}
</style>
