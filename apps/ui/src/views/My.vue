<script setup lang="ts">
const uiStore = useUiStore();
const router = useRouter();
const { web3, authInitiated } = useWeb3();

const ready = ref(false);

watch(
  [() => web3.value.account, () => web3.value.authLoading, authInitiated],
  async ([account, authLoading, authInitiated]) => {
    if (!authInitiated || authLoading) return;

    if (!account) return router.push({ name: 'landing' });

    ready.value = true;
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <div>
      <div
        class="ml-0 lg:ml-[240px] mr-0 xl:mr-[240px]"
        :class="{ 'translate-x-[240px] lg:translate-x-0': uiStore.sidebarOpen }"
      >
        <UiLoading v-if="!ready" class="block p-4" />
        <router-view v-else />
      </div>
      <div class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0" />
    </div>
  </div>
</template>
