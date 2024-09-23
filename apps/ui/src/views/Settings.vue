<script setup lang="ts">
const { web3Account } = useWeb3();
</script>

<template>
  <router-view :key="web3Account.toLowerCase()" />
</template>
