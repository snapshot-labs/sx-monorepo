<script setup lang="ts">
const votesHeader = ref<HTMLElement | null>(null);

defineExpose({
  votesHeader
});
</script>

<template>
  <div
    ref="votesHeader"
    class="flex px-4 bg-skin-bg border-b w-full font-medium top-[112px] lg:top-[113px] z-10 sticky"
  >
    <slot />
  </div>
</template>
