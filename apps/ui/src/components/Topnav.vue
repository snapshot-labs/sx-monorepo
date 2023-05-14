<script setup lang="ts">
import { useFocus } from '@vueuse/core';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { shorten } from '@/helpers/utils';
import { useUiStore } from '@/stores/ui';

const emit = defineEmits(['toggle']);

const route = useRoute();
const router = useRouter();
const auth = getInstance();
const uiStore = useUiStore();
const { modalAccountOpen } = useModal();
const { login, web3 } = useWeb3();
const { toggleSkin, getMode } = useUserSkin();

const loading = ref(false);
const searchInput = ref();
const searchValue = ref('');

const { focused } = useFocus(searchInput);

const currentRouteName = computed(() => {
  return String(route.matched[0]?.name);
});

async function handleLogin(connector) {
  modalAccountOpen.value = false;
  loading.value = true;
  await login(connector);
  loading.value = false;
}

function handleSearchSubmit(e: Event) {
  e.preventDefault();

  if (!searchValue.value) {
    router.push({ name: 'space-proposals' });
  } else {
    router.push({ name: 'space-search-proposals', query: { q: searchValue.value } });
  }
}

watch(route, to => {
  if (to.name === 'space-search-proposals') return;
  searchValue.value = '';
});
</script>

<template>
  <nav
    class="border-b fixed top-0 right-0 z-50 left-0 lg:left-[72px]"
    :class="{
      'translate-x-[72px] lg:translate-x-0': uiStore.sidebarOpen
    }"
  >
    <div
      class="flex items-center justify-between h-[71px] px-4 bg-skin-bg"
      :class="{
        'lg:ml-[240px]': route.matched[0]?.name === 'space',
        'translate-x-[240px] lg:translate-x-0':
          uiStore.sidebarOpen && route.matched[0]?.name === 'space'
      }"
    >
      <div class="flex flex-grow items-center h-full">
        <IH-menu-alt-2
          class="inline-block text-skin-link mr-4 cursor-pointer lg:hidden"
          @click="emit('toggle')"
        />
        <div v-if="currentRouteName === 'space'" class="flex items-center flex-1 px-2 py-3 h-full">
          <IH-search class="mr-[12px] flex-shrink-0" :class="{ 'text-skin-link': focused }" />
          <form class="flex flex-grow" @submit="handleSearchSubmit">
            <input
              ref="searchInput"
              v-model="searchValue"
              type="text"
              placeholder="Search"
              class="bg-transparent text-skin-link text-[19px] w-full"
            />
          </form>
        </div>
        <router-link v-else :to="{ path: '/' }" class="flex items-center" style="font-size: 24px">
          snapshot x
        </router-link>
      </div>
      <div :key="web3.account" class="flex">
        <UiButton v-if="loading || web3.authLoading" loading class="!px-0 w-[46px]" />
        <UiButton
          v-else
          class="float-left !px-0 w-[46px] sm:w-auto sm:!px-3 text-center"
          @click="modalAccountOpen = true"
        >
          <span v-if="auth.isAuthenticated.value" class="sm:flex items-center space-x-2">
            <Stamp :id="web3.account" :size="18" />
            <span class="hidden sm:block" v-text="web3.name || shorten(web3.account)" />
          </span>
          <template v-else>
            <span class="hidden sm:block" v-text="'Connect wallet'" />
            <IH-login class="sm:hidden inline-block" />
          </template>
        </UiButton>
        <PendingTransactionsIndicator class="ml-2" />
        <UiButton class="!px-0 w-[46px] ml-2" @click="toggleSkin">
          <IH-light-bulb v-if="getMode() === 'dark'" class="inline-block" />
          <IH-moon v-else class="inline-block" />
        </UiButton>
      </div>
    </div>
  </nav>
  <teleport to="#modal">
    <ModalAccount :open="modalAccountOpen" @close="modalAccountOpen = false" @login="handleLogin" />
  </teleport>
</template>
