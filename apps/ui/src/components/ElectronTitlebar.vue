<script setup lang="ts">
const isElectron = !!process.env.ELECTRON;
</script>

<template>
  <div
    v-if="isElectron"
    class="fixed top-0 inset-x-0 z-50 bg-skin-bg border-b"
    style="
      -webkit-app-region: drag;
      user-select: none;
      height: 32px;
      min-height: 32px;
      max-height: 32px;
    "
  />
</template>
