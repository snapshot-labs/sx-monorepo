<script setup lang="ts">
const { web3Account } = useWeb3();
</script>

<template>
  <UiContainerPage>
    <router-view :key="web3Account.toLowerCase()" />
  </UiContainerPage>
</template>
