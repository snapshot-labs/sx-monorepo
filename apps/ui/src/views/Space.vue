<script setup lang="ts">
const { loadVotes } = useAccount();
const { web3 } = useWeb3();
const { space, isPending } = useCurrentSpace();

watch(
  [space, () => web3.value.account],
  ([space, account]) => {
    if (!space || !account) return;
    loadVotes(space.network, [space.id]);
  },
  { immediate: true }
);
</script>

<template>
  <UiLoading v-if="isPending" class="block p-4" />

  <div v-else-if="!space">
    <div class="px-4 py-3 flex items-center text-skin-link gap-2">
      <IH-exclamation-circle />
      <span>Failed to load space.</span>
    </div>
  </div>
  <router-view v-else-if="space" :space="space" />
</template>
