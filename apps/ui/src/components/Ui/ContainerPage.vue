<script setup lang="ts">
defineProps<{
  loading?: boolean;
}>();
</script>

<template>
  <div class="flex">
    <div class="flex-auto w-0">
      <UiLoading v-if="loading" class="block p-4" />
      <slot v-else />
    </div>
    <div class="hidden xl:block w-[240px] border-l" />
  </div>
</template>
