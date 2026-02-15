<script setup lang="ts">
const { loadVotes } = useAccount();
const { web3 } = useWeb3();
const { organization, isLoading } = useOrganization();
const { space } = useCurrentSpace();

watch(
  [() => organization.value?.spaces, () => web3.value.account],
  ([spaces, account]) => {
    if (!spaces || !account) return;
    for (const space of spaces) {
      loadVotes(space.network, [space.id]);
    }
  },
  { immediate: true }
);
</script>

<template>
  <UiLoading v-if="isLoading" class="block p-4" />
  <router-view v-else :space="space" />
</template>
