<script setup lang="ts">
import { getCacheHash, shorten } from '@/helpers/utils';

const { hasAppNav } = useNavigation();

const route = useRoute();
const router = useRouter();
const usersStore = useUsersStore();
const uiStore = useUiStore();
const { modalAccountOpen, modalAccountWithoutDismissOpen, resetAccountModal } =
  useModal();
const { logout, web3 } = useWeb3();
const { toggleTheme, currentTheme } = useTheme();
const { isWhiteLabel } = useWhiteLabel();
const { isAuctionApp } = useApp();

const SEARCH_CONFIG = {
  space: {
    defaultRoute: 'space-proposals',
    searchRoute: 'space-proposals',
    placeholder: 'Search for a proposal',
    exclude: ['space-editor', 'space-proposal']
  },
  my: {
    defaultRoute: 'my-explore',
    searchRoute: 'my-explore',
    placeholder: 'Search for a space'
  }
};

const searchInput = ref();
const searchValue = ref('');

const user = computed(
  () =>
    usersStore.getUser(web3.value.account) || {
      id: web3.value.account,
      name: web3.value.name,
      avatar: undefined
    }
);
const cb = computed(() => getCacheHash(user.value.avatar));

const searchConfig = computed(() => {
  const rootName = route.matched[0]?.name || '';
  const subRootName = route.matched[1]?.name || '';
  const exclusions = SEARCH_CONFIG[rootName]?.exclude || [];

  if (SEARCH_CONFIG[rootName] && !exclusions.includes(subRootName)) {
    return SEARCH_CONFIG[rootName];
  }

  return null;
});

function handleSearchSubmit(e: Event) {
  e.preventDefault();

  if (!searchConfig.value) return;

  if (!searchValue.value)
    return router.push({ name: searchConfig.value.defaultRoute });

  router.push({
    name: searchConfig.value.searchRoute,
    query: {
      ...(searchConfig.value.searchRoute === route.name ? route.query : {}),
      q: searchValue.value
    }
  });
}

watch(
  () => (route.query.q as string) || '',
  searchQuery => (searchValue.value = searchQuery),
  { immediate: true }
);

function handleKeyboardShortcut(event: KeyboardEvent) {
  if (event.key !== '/') return;

  const activeElement = document.activeElement;
  const tagName = activeElement?.tagName.toLowerCase() || '';

  if (
    modalAccountOpen.value ||
    modalAccountWithoutDismissOpen.value ||
    uiStore.sideMenuOpen ||
    activeElement === searchInput.value ||
    ['input', 'textarea'].includes(tagName)
  ) {
    return;
  }

  event.preventDefault();
  searchInput.value?.focus();
}

watchEffect(onCleanup => {
  if (searchConfig.value) {
    document.addEventListener('keydown', handleKeyboardShortcut);
    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyboardShortcut);
    });
  }
});

onUnmounted(() => {
  resetAccountModal();
});
</script>

<template>
  <UiTopnav v-bind="$attrs">
    <div
      class="flex items-center h-full truncate"
      :class="{
        'lg:border-r lg:pr-4 lg:w-[240px] shrink-0': hasAppNav,
        'border-r pr-4 w-[240px]': hasAppNav && uiStore.sideMenuOpen
      }"
    >
      <slot name="toggle-sidebar-button" />
      <Breadcrumb
        :class="[
          'ml-4',
          { 'hidden lg:flex': searchConfig && !uiStore.sideMenuOpen }
        ]"
      />
    </div>

    <form
      v-if="searchConfig"
      id="search-form"
      class="flex flex-1 py-3 h-full"
      @submit="handleSearchSubmit"
    >
      <label class="flex items-center w-full space-x-2.5">
        <IH-search class="shrink-0" />
        <input
          ref="searchInput"
          v-model.trim="searchValue"
          type="text"
          :placeholder="searchConfig.placeholder"
          class="bg-transparent text-skin-link text-[19px] w-full"
        />
      </label>
    </form>

    <div v-if="isAuctionApp" class="flex-grow">
      <IC-snapshot class="size-[28px] text-skin-link" />
    </div>

    <div class="flex space-x-2 shrink-0">
      <UiButton v-if="web3.authLoading" loading />
      <UiDropdown v-else-if="web3.account" :key="route.fullPath">
        <template #button>
          <UiButton class="sm:w-auto !px-0 sm:!px-3">
            <span
              class="sm:flex items-center space-x-2"
              data-testid="profile-button"
            >
              <UiStamp :id="user.id" :size="18" :cb="cb" />
              <span
                class="hidden sm:block truncate max-w-[120px]"
                v-text="user.name || shorten(user.id)"
              />
            </span>
          </UiButton>
        </template>
        <template v-if="web3.account" #items>
          <UiDropdownItem
            v-if="!isAuctionApp"
            :to="{ name: 'user', params: { user: web3.account } }"
          >
            <IH-user />
            My profile
          </UiDropdownItem>
          <UiDropdownItem
            v-if="!isAuctionApp"
            :to="{ name: 'settings-spaces' }"
          >
            <IH-cog />
            Settings
          </UiDropdownItem>
          <UiDropdownItem @click="modalAccountOpen = true">
            <IH-switch-horizontal />
            Change wallet
          </UiDropdownItem>
          <hr class="bg-skin-text/20 h-[2px]" />
          <UiDropdownItem class="!text-skin-danger" @click="logout()">
            <IH-logout />
            Log out
          </UiDropdownItem>
        </template>
      </UiDropdown>
      <UiButton
        v-else
        class="sm:w-auto !px-0 sm:!px-3"
        @click="modalAccountOpen = true"
      >
        <span class="hidden sm:block" v-text="'Log in'" />
        <IH-login class="sm:hidden inline-block" />
      </UiButton>
      <IndicatorPendingTransactions />
      <UiButton v-if="!isWhiteLabel" uniform @click="toggleTheme()">
        <IH-sun v-if="currentTheme === 'dark'" />
        <IH-moon v-else />
      </UiButton>
    </div>
  </UiTopnav>
</template>

<style lang="scss" scoped>
#search-form:focus-within svg {
  color: rgba(var(--link));
}
</style>
