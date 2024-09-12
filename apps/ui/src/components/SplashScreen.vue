<script lang="ts" setup>
withDefaults(
  defineProps<{
    failed: boolean;
  }>(),
  {
    failed: false
  }
);
</script>

<template>
  <div class="flex flex-col justify-center items-center h-screen gap-5">
    <img src="@/assets/snapshot.svg" alt="Snapshot" class="w-[80px]" />
    <div v-if="failed" class="text-center">
      <div class="text-skin-text text-[28px]">Error while loading the site</div>
      <div class="text-[24px]">Please try again</div>
    </div>
    <UiLoading v-else :width="36" :height="26" class="opacity-40" />
  </div>
</template>
