<script setup lang="ts">
const uiStore = useUiStore();
const { web3Account } = useWeb3();
</script>

<template>
  <div>
    <div>
      <div
        class="mx-0 lg:ml-[240px] xl:mr-[240px]"
        :class="{ 'translate-x-[240px] lg:translate-x-0': uiStore.sidebarOpen }"
      >
        <router-view :key="web3Account.toLowerCase()" />
      </div>
      <div
        class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0"
      />
    </div>
  </div>
</template>
