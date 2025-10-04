<script setup lang="ts">
const isElectron = !!process.env.ELECTRON;
</script>

<template>
  <div
    v-if="isElectron"
    class="fixed inset-x-0 z-50 bg-skin-bg border-b h-5 select-none"
    style="-webkit-app-region: drag"
  />
</template>
