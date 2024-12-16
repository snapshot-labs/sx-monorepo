<script setup lang="ts">
const { web3, web3Account } = useWeb3();
const { modalAccountWithoutDismissOpen } = useModal();

watch(
  [() => web3.value.account, () => web3.value.authLoading],
  ([account, authLoading]) => {
    if (!account && !authLoading) {
      modalAccountWithoutDismissOpen.value = true;
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  modalAccountWithoutDismissOpen.value = false;
});
</script>

<template>
  <router-view :key="web3Account.toLowerCase()" />
</template>
