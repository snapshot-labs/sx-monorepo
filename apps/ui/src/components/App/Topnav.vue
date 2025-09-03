<script setup lang="ts">
import { getCacheHash, shorten } from '@/helpers/utils';
import { Connector } from '@/networks/types';
import BimaLogo from '@/components/App/BimaLogo.vue'; // New: Import BimaLogo component

defineProps<{
  hasAppNav: boolean;
}>();

const route = useRoute();
const router = useRouter();
const usersStore = useUsersStore();
const uiStore = useUiStore();
const { modalAccountOpen, modalAccountWithoutDismissOpen, resetAccountModal } =
  useModal();
const { login, web3 } = useWeb3();
const { toggleTheme, currentTheme } = useTheme();
const { isWhiteLabel } = useWhiteLabel();

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

const searchConfig = computed(() => {
  const rootName = route.matched[0]?.name || '';
  const subRootName = route.matched[1]?.name || '';
  const exclusions = SEARCH_CONFIG[rootName]?.exclude || [];

  // New: Hide search config if we are on a 'my' route, matching the image design.
  if (isMyRootRoute.value) return null;

  if (SEARCH_CONFIG[rootName] && !exclusions.includes(subRootName)) {
    return SEARCH_CONFIG[rootName];
  }

  return null;
});

// New: Computed property to determine if the root route is 'my'
const isMyRootRoute = computed(() => route.matched[0]?.name === 'my');

async function handleLogin(connector: Connector) {
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

onUnmounted(() => {
  resetAccountModal();
});
</script>

<template>
  <UiTopnav v-bind="$attrs">
    <!-- New: Conditional content for 'my' route - Bima logo and navigation links -->
    <div v-if="isMyRootRoute" class="flex items-center h-full truncate px-4 space-x-6">
      <AppLink :to="{ name: 'my-home' }" class="flex items-center space-x-2.5">
        <BimaLogo class="h-5 w-auto text-black" /> <!-- Apply text-black or adjust fill in SVG if dynamic coloring is needed -->
      </AppLink>
      <AppLink :to="{ name: 'my-home' }"
               class="text-skin-link text-[19px] font-medium"
               :class="{'font-semibold': route.name === 'my-home'}">
        Home
      </AppLink>
      <AppLink :to="{ name: 'my-explore' }"
               class="text-skin-link text-[19px] font-medium"
               :class="{'font-semibold': route.name === 'my-explore'}">
        Explore
      </AppLink>
      <!-- If "Docs" and "Launch Mainnet Alpha" buttons are needed, they would go here. -->
      <!-- For this request, we only focused on the Bima logo, Home, and Explore links on the left. -->
    </div>

    <!-- Existing: Default app navigation for other routes (sidebar toggle, breadcrumb) -->
    <div
      v-else
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

    <!-- Existing: Search form - now conditionally rendered to hide on 'my' routes -->
    <form
      v-if="searchConfig && !isMyRootRoute"
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

    <div class="flex space-x-2 shrink-0">
      <UiButton v-if="loading || web3.authLoading" loading />
      <UiButton
        v-else
        class="float-left !px-0 w-[46px] sm:w-auto sm:!px-3 text-center"
        @click="modalAccountOpen = true"
      >
        <span v-if="web3.account" class="sm:flex items-center space-x-2">
          <UiStamp :id="user.id" :size="18" :cb="cb" />
          <span
            class="hidden sm:block truncate max-w-[120px]"
            v-text="user.name || shorten(user.id)"
          />
        </span>
        <template v-else>
          <span class="hidden sm:block" v-text="'Log in'" />
          <IH-login class="sm:hidden inline-block" />
        </template>
      </UiButton>
      <IndicatorPendingTransactions />
      <UiButton
        v-if="!isWhiteLabel"
        class="!px-0 w-[46px]"
        @click="toggleTheme()"
      >
        <IH-sun v-if="currentTheme === 'dark'" class="inline-block" />
        <IH-moon v-else class="inline-block" />
      </UiButton>
    </div>
  </UiTopnav>
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
