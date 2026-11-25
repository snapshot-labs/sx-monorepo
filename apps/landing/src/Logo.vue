<script setup lang="ts">
const PATHS = [
  'M200 300V100C255.228 100 300 144.772 300 200C300 255.228 255.228 300 200 300Z',
  'M0 100C0 44.772 44.772 0 100 0V200C44.772 200 0 155.228 0 100Z',
  'M100 100H300V0H200C144.771 0 100 44.772 100 100Z',
  'M200 200H0V300H100C155.229 300 200 255.228 200 200Z'
];
</script>

<template>
  <a
    href="/"
    aria-label="Snapshot home"
    class="flex h-[66px] items-center bg-yellow px-5"
  >
    <svg width="38" height="38" viewBox="0 0 300 300" aria-hidden="true">
      <path v-for="d in PATHS" :key="d" :d="d" />
    </svg>
  </a>
</template>
