<script setup lang="ts">
const isElectron = !!process.env.ELECTRON;
</script>

<template>
  <header
    class="fixed inset-x-0 max-w-maximum !mx-auto pointer-events-none z-50"
    :class="isElectron ? 'top-[32px]' : 'top-0'"
  >
    <div
      class="border-b h-[72px] bg-skin-bg flex items-center justify-between pr-4 gap-4 pointer-events-auto"
    >
      <slot />
    </div>
  </header>
</template>
