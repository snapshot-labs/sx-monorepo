<script setup lang="ts">
import { getCacheHash, shorten } from '@/helpers/utils';
import { Connector } from '@/networks/types';
import BimaLogo from '@/components/App/BimaLogo.vue';
import IHBell from '~icons/heroicons-outline/bell';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt'; // Import GlobeAlt icon for Overview
import IHNewspaper from '~icons/heroicons-outline/newspaper'; // Import Newspaper icon for Proposals
import IHUserGroup from '~icons/heroicons-outline/user-group'; // Import UserGroup icon for Leaderboard


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
const notificationsStore = useNotificationsStore();

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

  // Hide search config if we are on a 'my' root route.
  if (isMyRootRoute.value) return null;

  if (SEARCH_CONFIG[rootName] && !exclusions.includes(subRootName)) {
    return SEARCH_CONFIG[rootName];
  }

  return null;
});

// Computed property to determine if the root route is 'my'
const isMyRootRoute = computed(() => route.matched[0]?.name === 'my');

// Computed property to determine if the root route is 'space'
const isSpaceRootRoute = computed(() => route.matched[0]?.name === 'space' && route.name !== 'space-settings');

// New: Computed property to check if the current space is 'bima.eth'
const isCurrentSpaceBimaEth = computed(() => {
  const spaceParam = route.params.space as string | undefined;
  return isSpaceRootRoute.value && spaceParam?.endsWith(':bima.eth');
});

// Computed property for unread notifications count
const unreadNotificationsCount = computed(
  () => notificationsStore.unreadNotificationsCount
);

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
    <!-- Conditional content for 'my' route - Bima logo and navigation links -->
    <div v-if="isMyRootRoute" class="flex items-center h-full truncate px-4 space-x-6">
      <AppLink :to="{ name: 'my-home' }" class="flex items-center space-x-2.5">
        <BimaLogo class="h-5 w-auto text-black" />
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
    </div>

    <!-- Conditional content for 'space' route - Space-specific navigation links -->
    <div v-else-if="isSpaceRootRoute" class="flex items-center h-full truncate px-4 space-x-6">
      <!-- New: Display BimaLogo if the current space is 'bima.eth' -->
      <AppLink
        v-if="isCurrentSpaceBimaEth"
        :to="{ name: 'space-overview', params: { space: route.params.space } }"
        class="flex items-center space-x-2.5 !mr-4"
      >
        <BimaLogo class="h-5 w-auto text-black" />
      </AppLink>

      <AppLink
        :to="{ name: 'space-overview', params: { space: route.params.space } }"
        class="text-skin-link text-[19px] font-medium"
        :class="{'font-semibold': route.name === 'space-overview'}"
      >
        <IH-globe-alt class="inline-block mr-2" /> Overview
      </AppLink>
      <AppLink
        :to="{ name: 'space-proposals', params: { space: route.params.space } }"
        class="text-skin-link text-[19px] font-medium"
        :class="{'font-semibold': route.name === 'space-proposals'}"
      >
        <IH-newspaper class="inline-block mr-2" /> Proposals
      </AppLink>
      <AppLink
        :to="{ name: 'space-leaderboard', params: { space: route.params.space } }"
        class="text-skin-link text-[19px] font-medium"
        :class="{'font-semibold': route.name === 'space-leaderboard'}"
      >
        <IH-user-group class="inline-block mr-2" /> Leaderboard
      </AppLink>
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

    <!-- Existing: Search form -->
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

    <div class="flex space-x-2 shrink-0">
      <!-- Notifications button -->
      <UiButton
        v-if="web3.account"
        class="!px-0 w-[46px] relative"
        :class="{ 'text-skin-link': unreadNotificationsCount > 0 }"
        @click="router.push({ name: 'my-notifications' })"
      >
        <IH-bell class="inline-block" />
        <div
          v-if="unreadNotificationsCount > 0"
          class="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
        >
          <span class="sr-only">{{ unreadNotificationsCount }} unread notifications</span>
        </div>
      </UiButton>

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
