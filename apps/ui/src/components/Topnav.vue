<script setup>
import { ref } from 'vue';
import { shorten } from '@/helpers/utils';
import { useModal } from '@/composables/useModal';
import { useWeb3 } from '@/composables/useWeb3';
import { useTxStatus } from '@/composables/useTxStatus';
import { useUserSkin } from '@/composables/useUserSkin';

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
  <nav id="topnav" class="border-b w-full fixed top-0 z-10 bg-skin-bg">
    <div class="mx-4">
      <div class="flex items-center" style="height: 78px">
        <div class="flex-auto flex items-center">
          <router-link
            :to="{ path: '/' }"
            class="flex items-center"
            style="font-size: 24px"
          >
            snapshot x
          </router-link>
        </div>
        <div :key="web3.account">
          <UiButton
            v-if="loading || web3.authLoading"
            loading
            class="!px-0 w-[46px]"
          />
          <UiButton
            v-else
            @click="modalAccountOpen = true"
            class="float-left !px-0 w-[46px] sm:w-auto sm:!px-3 text-center"
          >
            <span
              v-if="$auth.isAuthenticated.value"
              class="sm:flex items-center space-x-2"
            >
              <Stamp :id="web3.account" :size="18" />
              <span
                v-text="web3.name || shorten(web3.account)"
                class="hidden sm:block"
              />
            </span>
            <template v-else>
              <span class="hidden sm:block" v-text="'Connect wallet'" />
              <IH-login class="sm:hidden inline-block" />
            </template>
          </UiButton>
          <UiButton @click="toggleSkin" class="!px-0 w-[46px] ml-2">
            <IH-light-bulb v-if="getMode() === 'dark'" class="inline-block" />
            <IH-moon v-else class="inline-block" />
          </UiButton>
        </div>
      </div>
    </div>
    <div
      class="bg-blue text-white text-center py-2 fixed top-[79px] w-full"
      v-if="pendingCount > 0"
    >
      <UiLoading :fill-white="true" class="mr-2" />
      {{ pendingCount }} pending transaction
    </div>
  </nav>
  <div v-if="pendingCount > 0" class="pt-[43px]"></div>
  <teleport to="#modal">
    <ModalAccount
      :open="modalAccountOpen"
      @close="modalAccountOpen = false"
      @login="handleLogin"
    />
  </teleport>
</template>
