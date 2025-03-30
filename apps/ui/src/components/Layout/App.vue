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
const { setSkin } = useSkin();
const { setTheme } = useTheme();
const { isWhiteLabel, space: whiteLabelSpace, skinSettings } = useWhiteLabel();
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
    ![
      'space-proposal',
      'create-space-snapshot',
      'create-space-snapshot-x'
    ].includes(String(route.matched[0]?.name)) &&
    !['space-editor', 'space-proposal'].includes(String(route.matched[1]?.name))
);

const hasTopNav = computed(() => {
  return 'space-editor' !== String(route.matched[1]?.name);
});

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

watch(
  isWhiteLabel,
  isWhiteLabel => {
    if (!isWhiteLabel || !skinSettings.value) {
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
    class="min-h-screen flex flex-col"
    :class="{ 'overflow-clip': scrollDisabled }"
  >
    <UiLoading v-if="app.loading || !app.init" class="overlay big" />
    <div v-else class="flex flex-auto">
      <AppSidebar
        v-if="hasSidebar"
        :class="[
          `hidden lg:flex flex-none border-r`,
          { '!flex': uiStore.sideMenuOpen }
        ]"
      />
      <AppNav
        v-if="hasAppNav"
        :class="[
          'hidden lg:flex border-r flex-none',
          {
            '!flex': uiStore.sideMenuOpen
          }
        ]"
      />
      <div class="flex flex-col flex-auto maximum:border-r relative">
        <UiBackdrop
          v-if="uiStore.sideMenuOpen"
          @click="uiStore.sideMenuOpen = false"
        />
        <AppTopnav :has-app-nav="hasAppNav" :class="{ hidden: !hasTopNav }">
          <template #toggle-sidebar-button>
            <button
              v-if="hasSwipeableContent"
              type="button"
              class="text-skin-link lg:hidden shrink-0"
              :class="{ hidden: uiStore.sideMenuOpen }"
              @click="uiStore.toggleSidebar"
            >
              <IH-menu-alt-2 />
            </button>
          </template>
        </AppTopnav>
        <main
          :class="[
            'relative flex-auto',
            { 'xl:border-r xl:mr-[240px]': hasPlaceHolderSidebar }
          ]"
        >
          <router-view class="h-full pb-10" />
        </main>
      </div>
    </div>
    <div class="sticky bottom-0 inset-x-0 z-[101] flex flex-col flex-none">
      <div class="relative">
        <AppNotifications />
      </div>
      <AppBottomNav
        v-if="web3.account && !isWhiteLabel && uiStore.sideMenuOpen"
      />
    </div>
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
      v-if="route.name !== 'space-editor' && transaction && network"
      :open="!!transaction"
      :network="network"
      :initial-state="transaction._form"
      @add="handleTransactionAccept"
      @close="handleTransactionReject"
    />
  </div>
</template>
