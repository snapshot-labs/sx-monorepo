<script setup lang="ts">
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { getCacheHash, shorten } from '@/helpers/utils';

defineProps<{
  hasAppNav: boolean;
}>();

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

  if (SEARCH_CONFIG[rootName] && !exclusions.includes(subRootName)) {
    return SEARCH_CONFIG[rootName];
  }

  return null;
});

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

onUnmounted(() => {
  resetAccountModal();
});
</script>

<template>
  <UiTopnav v-bind="$attrs" class="gap-4 pr-4">
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

    <div class="flex space-x-2 shrink-0">
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
          <span class="hidden sm:block" v-text="'Log in'" />
          <IH-login class="sm:hidden inline-block" />
        </template>
      </UiButton>
      <IndicatorPendingTransactions />
      <UiDropdown :z-index="999" :portal="false">
        <template #button>
          <slot name="button">
            <UiButton class="!px-0 w-[46px]" v-bind="$attrs">
              <IH-cog-6-tooth class="inline-block" />
            </UiButton>
          </slot>
        </template>
        <template #items>
          <UiDropdownItem v-slot="{ active }">
            <a
              :class="['flex gap-2 items-center', { 'opacity-80': active }]"
              href="https://snapshot.box"
            >
              <IH-bolt :width="16" />
              Mainnet
            </a>
          </UiDropdownItem>
          <UiDropdownItem v-slot="{ active }">
            <a
              :class="['flex gap-2 items-center', { 'opacity-80': active }]"
              href="https://testnet.snapshot.box"
            >
              <IH-beaker :width="16" />
              Testnet
            </a>
          </UiDropdownItem>
          <UiDropdownItem v-slot="{ active }">
            <a
              :class="['flex gap-2 items-center', { 'opacity-80': active }]"
              href="https://v1.snapshot.box"
            >
              <IH-bolt-slash :width="16" />
              Old interface
            </a>
          </UiDropdownItem>
          <hr class="h-[2px] bg-skin-text/20 mx-3" />
          <UiDropdownItem v-slot="{ active }">
            <button
              type="button"
              class="flex items-center gap-2"
              :class="{ 'opacity-80': active }"
              @click="toggleSkin"
            >
              <IH-light-bulb
                v-if="currentMode === 'dark'"
                class="inline-block"
                :width="16"
              />
              <IH-moon v-else class="inline-block" :width="16" />
              <span>
                Switch to
                {{ currentMode === 'dark' ? 'light' : 'dark' }} theme
              </span>
            </button>
          </UiDropdownItem>
          <hr class="h-[2px] bg-skin-text/20 mx-3" />
          <UiDropdownItem v-slot="{ active }">
            <a
              :class="['flex gap-2 items-center', { 'opacity-80': active }]"
              href="https://snapshot.mirror.xyz/0qnfjmE0SFeUykArdi664oO4qFcZUoZTTOd8m7es_Eo"
            >
              <IH-sparkles :width="16" />
              Discover our new interface
            </a>
          </UiDropdownItem>
        </template>
      </UiDropdown>
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
