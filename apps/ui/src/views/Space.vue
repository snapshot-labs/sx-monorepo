<script setup lang="ts">
const { loadVotes } = useAccount();
const { web3 } = useWeb3();
const { space, isPending, networkId, address } = useCurrentSpace();

watch(
  [networkId, address, () => web3.value.account],
  ([networkId, address, account]) => {
    if (!networkId || !address || !account) return;
    loadVotes(networkId, [address]);
  },
  { immediate: true }
);
</script>

<template>
  <UiLoading v-if="isPending" class="block p-4" />
  <router-view v-else-if="space" :space="space" />
</template>
