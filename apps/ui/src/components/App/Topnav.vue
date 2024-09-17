<script setup lang="ts">
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { getCacheHash, shorten } from '@/helpers/utils';

const route = useRoute();
const router = useRouter();
const usersStore = useUsersStore();
const auth = getInstance();
const uiStore = useUiStore();
const { modalAccountOpen, modalAccountWithoutDismissOpen, resetAccountModal } =
  useModal();
const { login, web3 } = useWeb3();
const { toggleSkin, currentMode } = useUserSkin();

const SEARCH_CONFIG = {
  space: {
    defaultRoute: 'space-proposals',
    searchRoute: 'space-search',
    placeholder: 'Search for a proposal'
  },
  my: {
    defaultRoute: 'my-explore',
    searchRoute: 'my-explore',
    placeholder: 'Search for a space'
  }
};

const loading = ref(false);
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

const hasAppNav = computed(() =>
  ['my', 'settings', 'space'].includes(String(route.matched[0]?.name))
);
const searchConfig = computed(
  () => SEARCH_CONFIG[route.matched[0]?.name || '']
);

async function handleLogin(connector) {
  resetAccountModal();
  loading.value = true;
  await login(connector);
  loading.value = false;
}

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
</script>

<template>
  <nav
    class="border-b fixed top-0 inset-x-0 z-50 lg:left-[72px] flex items-center justify-between h-[72px] bg-skin-bg space-x-4 pr-4"
    :class="{
      'translate-x-[72px] lg:translate-x-0': uiStore.sidebarOpen
    }"
  >
    <div
      class="flex items-center h-full truncate"
      :class="{
        'lg:border-r lg:pr-4 lg:w-[240px] shrink-0': hasAppNav,
        'border-r pr-4 w-[240px]': hasAppNav && uiStore.sidebarOpen
      }"
    >
      <button
        type="button"
        class="text-skin-link cursor-pointer lg:hidden ml-4"
        @click="uiStore.toggleSidebar"
      >
        <IH-menu-alt-2 />
      </button>

      <Breadcrumb
        :class="[
          'ml-4',
          { 'hidden lg:flex': searchConfig && !uiStore.sidebarOpen }
        ]"
      >
      </Breadcrumb>
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

    <div class="flex space-x-2.5 shrink-0">
      <UiButton v-if="loading || web3.authLoading" loading />
      <UiButton
        v-else
        class="float-left !px-0 w-[46px] sm:w-auto sm:!px-3 text-center"
        @click="modalAccountOpen = true"
      >
        <span
          v-if="auth.isAuthenticated.value"
          class="sm:flex items-center space-x-2"
        >
          <UiStamp :id="user.id" :size="18" :cb="cb" />
          <span
            class="hidden sm:block truncate max-w-[120px]"
            v-text="user.name || shorten(user.id)"
          />
        </span>
        <template v-else>
          <span class="hidden sm:block" v-text="'Connect wallet'" />
          <IH-login class="sm:hidden inline-block" />
        </template>
      </UiButton>
      <IndicatorPendingTransactions />
      <UiButton class="!px-0 w-[46px]" @click="toggleSkin">
        <IH-light-bulb v-if="currentMode === 'dark'" class="inline-block" />
        <IH-moon v-else class="inline-block" />
      </UiButton>
    </div>
  </nav>
  <teleport to="#modal">
    <ModalAccount
      :open="modalAccountOpen || modalAccountWithoutDismissOpen"
      :closeable="!modalAccountWithoutDismissOpen"
      @close="modalAccountOpen = false"
      @login="handleLogin"
    />
  </teleport>
</template>

<style lang="scss" scoped>
#search-form:focus-within svg {
  color: rgba(var(--link));
}
</style>
