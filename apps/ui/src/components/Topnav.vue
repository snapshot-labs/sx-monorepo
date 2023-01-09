<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { shorten } from '@/helpers/utils';
import { useUiStore } from '@/stores/ui';
import { useModal } from '@/composables/useModal';
import { useWeb3 } from '@/composables/useWeb3';
import { useTxStatus } from '@/composables/useTxStatus';
import { useUserSkin } from '@/composables/useUserSkin';

const emit = defineEmits(['toggle']);

const route = useRoute();

const uiStore = useUiStore();
const { pendingCount } = useTxStatus();
const { modalAccountOpen } = useModal();

const { login, web3 } = useWeb3();
const { toggleSkin, getMode } = useUserSkin();

const loading = ref(false);

async function handleLogin(connector) {
  modalAccountOpen.value = false;
  loading.value = true;
  await login(connector);
  loading.value = false;
}
</script>

<template>
  <nav
    class="border-b fixed top-0 right-0 z-10 left-0 lg:left-[72px]"
    :class="{
      'translate-x-[72px]': uiStore.sidebarOpen
    }"
  >
    <div
      class="flex items-center h-[71px] px-4 bg-skin-bg"
      :class="{
        'lg:translate-x-[240px]': route.matched[0]?.name === 'space',
        'translate-x-[240px]': uiStore.sidebarOpen && route.matched[0]?.name === 'space'
      }"
    >
      <div class="flex-auto">
        <div class="flex items-center">
          <IH-menu-alt-2
            class="inline-block text-skin-link mr-3 cursor-pointer lg:hidden"
            @click="emit('toggle')"
          />
          <router-link :to="{ path: '/' }" class="flex items-center" style="font-size: 24px">
            snapshot x
          </router-link>
        </div>
      </div>
      <div :key="web3.account">
        <UiButton v-if="loading || web3.authLoading" loading class="!px-0 w-[46px]" />
        <UiButton
          v-else
          class="float-left !px-0 w-[46px] sm:w-auto sm:!px-3 text-center"
          @click="modalAccountOpen = true"
        >
          <span v-if="$auth.isAuthenticated.value" class="sm:flex items-center space-x-2">
            <Stamp :id="web3.account" :size="18" />
            <span class="hidden sm:block" v-text="web3.name || shorten(web3.account)" />
          </span>
          <template v-else>
            <span class="hidden sm:block" v-text="'Connect wallet'" />
            <IH-login class="sm:hidden inline-block" />
          </template>
        </UiButton>
        <UiButton class="!px-0 w-[46px] ml-2" @click="toggleSkin">
          <IH-light-bulb v-if="getMode() === 'dark'" class="inline-block" />
          <IH-moon v-else class="inline-block" />
        </UiButton>
      </div>
    </div>
    <div
      v-if="pendingCount > 0"
      class="bg-blue text-white text-center py-2 fixed top-[72px] w-full"
    >
      <UiLoading :fill-white="true" class="mr-2" />
      {{ pendingCount }} pending transaction
    </div>
  </nav>
  <div v-if="pendingCount > 0" class="pt-[43px]" />
  <teleport to="#modal">
    <ModalAccount :open="modalAccountOpen" @close="modalAccountOpen = false" @login="handleLogin" />
  </teleport>
</template>
