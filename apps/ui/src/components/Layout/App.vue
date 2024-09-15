<script lang="ts" setup>
import resolveConfig from 'tailwindcss/resolveConfig';
import { APP_NAME } from '@/helpers/constants';
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
const { isWhiteLabel, loaded: whiteLabelLoaded } = useWhiteLabel();
const { address, networkId } = useResolve(ref('id'));
const spacesStore = useSpacesStore();
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

const hasSidebar = computed(() => !isWhiteLabel.value);

const hasSwipeableContent = computed(() => hasSidebar.value || hasAppNav.value);

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
    window.innerWidth > LG_WIDTH ||
    !hasSwipeableContent ||
    !sidebarSwipeEnabled.value ||
    !isSwiping.value ||
    modalOpen.value
  )
    return;

  if (
    (direction.value === 'right' && !uiStore.sidebarOpen) ||
    (direction.value === 'left' && uiStore.sidebarOpen)
  ) {
    uiStore.toggleSidebar();
  }
});

watch(
  [() => isWhiteLabel.value, () => whiteLabelLoaded.value],
  async ([isWhiteLabel, whiteLabelLoaded]) => {
    if (!whiteLabelLoaded) return;

    if (!isWhiteLabel) {
      setAppName(APP_NAME);
      return;
    }

    if (!address.value || !networkId.value) return;

    await spacesStore.fetchSpace(address.value, networkId.value);
    const space = spacesStore.spacesMap.get(
      `${networkId.value}:${address.value}`
    );

    setAppName(space?.name || null);
  },
  { immediate: true }
);
</script>

<template>
  <div
    ref="el"
    class="min-h-screen"
    :class="{ 'overflow-clip': scrollDisabled }"
  >
    <UiLoading v-if="app.loading || !app.init" class="overlay big" />
    <template v-else>
      <div :class="['flex', { 'pb-6': bottomPadding }]">
        <AppSidebar
          v-if="hasSidebar"
          :class="[
            `hidden lg:flex app-sidebar h-screen fixed inset-y-0`,
            { '!flex app-sidebar-open': uiStore.sidebarOpen }
          ]"
          @navigated="uiStore.sidebarOpen = false"
        />
        <AppTopnav
          class="fixed top-0 inset-x-0 z-50"
          @navigated="uiStore.sidebarOpen = false"
        >
          <template v-if="hasSwipeableContent" #toggle-sidebar-button>
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
          @navigated="uiStore.sidebarOpen = false"
        />
        <button
          v-if="hasSwipeableContent && uiStore.sidebarOpen"
          type="button"
          class="backdrop"
          @click="uiStore.toggleSidebar"
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
    </template>
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
    }
  }
}

@media (screen(lg)) {
  .app-sidebar {
    & ~ :deep(main),
    & ~ :deep(header.fixed),
    & ~ :deep(main header.fixed),
    & ~ :deep(main footer.fixed),
    & ~ :deep(.app-nav) {
      @apply ml-[#{$sidebarWidth}];
    }

    &:has(~ .app-nav) ~ .app-nav {
      & ~ :deep(main),
      & ~ :deep(header.fixed),
      & ~ :deep(main header.fixed),
      & ~ :deep(main footer.fixed),
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
