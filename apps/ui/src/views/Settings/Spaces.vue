<script setup lang="ts">
useTitle('My spaces');

const { web3 } = useWeb3();
const { loading: spacesLoading, spaces, fetch } = useSpaces();

const loaded = ref(false);

watch(
  () => web3.value.account,
  async controller => {
    loaded.value = false;

    controller && (await fetch({ controller }));

    loaded.value = true;
  },
  { immediate: true }
);
</script>

<template>
  <UiContainer class="!max-w-screen-md pt-5">
    <h2 class="mb-4 mono !text-xl" v-text="'My spaces'" />
    <UiLoading v-if="!loaded || spacesLoading || web3.authLoading" />
    <div
      v-else-if="!spaces.length || !web3.account"
      class="flex items-center text-skin-link space-x-2"
    >
      <IH-exclamation-circle class="inline-block shrink-0" />
      <span v-text="'There are no spaces here.'" />
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
      <SpacesListItem v-for="space in spaces" :key="space.id" :space="space" />
    </div>
  </UiContainer>
</template>
