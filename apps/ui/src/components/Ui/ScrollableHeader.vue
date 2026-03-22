<script setup lang="ts">
const containerRef = ref<HTMLElement | null>(null);
const { x } = useScroll(containerRef);

function handleScroll(target: HTMLElement) {
  x.value = target.scrollLeft;
}

defineExpose({ handleScroll });
</script>

<template>
  <div ref="containerRef" class="overflow-hidden">
    <slot />
  </div>
</template>
