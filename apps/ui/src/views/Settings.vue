<script setup lang="ts">
const { web3Account } = useWeb3();
</script>

<template>
  <div>
    <div class="xl:mr-[240px]">
      <router-view :key="web3Account.toLowerCase()" />
    </div>
    <div
      class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0"
    />
  </div>
</template>
