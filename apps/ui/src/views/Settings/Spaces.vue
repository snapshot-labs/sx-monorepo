<script setup lang="ts">
import { onMounted } from 'vue';

useTitle('My spaces');
const { web3Account } = useWeb3();
const { loaded, spaces, fetch } = useSpaces();

onMounted(() => fetch({ controller: web3Account.value }));
</script>

<template>
  <div>
    <UiContainer class="!max-w-screen-md pt-5">
      <h2 class="mb-4 mono !text-xl" v-text="'My spaces'" />
      <UiLoading v-if="!loaded" class="block mb-2" />
      <div v-if="loaded && !spaces.length" class="py-3 flex items-center text-skin-link">
        <IH-exclamation-circle class="inline-block mr-2" />
        <span v-text="'There are no spaces here.'" />
      </div>
      <div v-else-if="loaded" class="max-w-screen-md">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <SpacesListItem v-for="space in spaces" :key="space.id" :space="space" />
        </div>
      </div>
    </UiContainer>
  </div>
</template>
