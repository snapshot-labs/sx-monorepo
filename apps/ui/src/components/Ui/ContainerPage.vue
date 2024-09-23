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
    <div class="hidden xl:block w-[240px]">
      <div class="w-[240px] fixed border-l top-[72px] bottom-0 right-0" />
    </div>
  </div>
</template>
