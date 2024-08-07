<script setup lang="ts">
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { shorten } from '@/helpers/utils';

const route = useRoute();
const router = useRouter();
const auth = getInstance();
const uiStore = useUiStore();
const { modalAccountOpen } = useModal();
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

const hasAppNav = computed(() =>
  ['my', 'settings'].includes(String(route.matched[0]?.name))
);
const searchConfig = computed(
  () => SEARCH_CONFIG[route.matched[0]?.name || '']
);
const showBreadcrumb = computed(() =>
  ['space', 'proposal', 'landing', 'settings'].includes(
    String(route.matched[0]?.name)
  )
);

async function handleLogin(connector) {
  modalAccountOpen.value = false;
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
    class="border-b fixed top-0 inset-x-0 z-50 lg:left-[72px]"
    :class="{
      'translate-x-[72px] lg:translate-x-0': uiStore.sidebarOpen
    }"
  >
    <div
      class="flex items-center justify-between h-[71px] px-4 bg-skin-bg space-x-1"
      :class="{
        'lg:ml-[240px]': hasAppNav,
        'translate-x-[240px] lg:translate-x-0': uiStore.sidebarOpen && hasAppNav
      }"
    >
      <div class="flex grow items-center h-full">
        <button
          type="button"
          class="inline-block text-skin-link mr-4 cursor-pointer lg:hidden"
          @click="uiStore.toggleSidebar"
        >
          <IH-menu-alt-2 />
        </button>
        <Breadcrumb v-if="showBreadcrumb">
          <router-link
            :to="{ path: '/' }"
            class="flex items-center"
            style="font-size: 24px"
          >
            snapshot
          </router-link>
        </Breadcrumb>
        <form
          v-if="searchConfig"
          id="search-form"
          class="flex flex-1 pr-2 py-3 h-full"
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
      </div>
      <div :key="web3.account" class="flex">
        <UiButton
          v-if="loading || web3.authLoading"
          loading
          class="!px-0 w-[46px]"
        />
        <UiButton
          v-else
          class="float-left !px-0 w-[46px] sm:w-auto sm:!px-3 text-center"
          @click="modalAccountOpen = true"
        >
          <span
            v-if="auth.isAuthenticated.value"
            class="sm:flex items-center space-x-2"
          >
            <UiStamp :id="web3.account" :size="18" />
            <span
              class="hidden sm:block"
              v-text="web3.name || shorten(web3.account)"
            />
          </span>
          <template v-else>
            <span class="hidden sm:block" v-text="'Connect wallet'" />
            <IH-login class="sm:hidden inline-block" />
          </template>
        </UiButton>
        <IndicatorPendingTransactions class="ml-2" />
        <UiButton class="!px-0 w-[46px] ml-2" @click="toggleSkin">
          <IH-light-bulb v-if="currentMode === 'dark'" class="inline-block" />
          <IH-moon v-else class="inline-block" />
        </UiButton>
      </div>
    </div>
  </nav>
  <teleport to="#modal">
    <ModalAccount
      :open="modalAccountOpen"
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
