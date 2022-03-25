<script setup>
import { computed, onMounted, provide, watch } from 'vue';
import { useModal } from '@/composables/useModal';
import { useUserSkin } from '@/composables/useUserSkin';
import { useApp } from '@/composables/useApp';
import { useWeb3 } from '@/composables/useWeb3';

const { modalOpen } = useModal();
const { userSkin } = useUserSkin();
const { init, app } = useApp();
const { web3 } = useWeb3();

provide('web3', web3);

const skin = computed(() => {
  return userSkin.value;
});

onMounted(async () => await init());

watch(modalOpen, val => {
  const el = document.body;
  el.classList[val ? 'add' : 'remove']('overflow-hidden');
});
</script>

<template>
  <div
    :class="skin"
    class="overflow-hidden font-serif text-base min-h-screen bg-skin-bg text-skin-text antialiased"
  >
    <UiLoading v-if="app.loading || !app.init" class="overlay big" />
    <div v-else class="pb-6">
      <Topnav />
      <router-view :key="$route.path" class="flex-auto" />
    </div>
    <div id="modal" />
    <Notifications />
  </div>
</template>
