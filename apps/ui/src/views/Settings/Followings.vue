<script setup lang="ts">
useTitle('Timeline');
const { web3Account } = useWeb3();
</script>

<template>
  <div>
    <UiContainer class="!max-w-screen-md pt-5">
      <h2 class="mb-4 mono !text-xl" v-text="'Timeline'" />
      My timeline
    </UiContainer>
  </div>
</template>
