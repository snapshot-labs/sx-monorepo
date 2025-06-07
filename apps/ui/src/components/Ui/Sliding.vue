<script setup lang="ts">
const container = ref<HTMLElement>();
const content = ref<HTMLElement>();

function handleOverflow() {
  if (!container.value || !content.value) return;

  const overflow = content.value.scrollWidth - container.value.clientWidth;

  if (overflow > 0) {
    container.value.style.setProperty('--distance', `-${overflow}px`);
    container.value.style.setProperty('--duration', `${overflow / 20}s`);
    container.value.classList.add('slide');
  } else {
    container.value.classList.remove('slide');
  }
}

onMounted(handleOverflow);
</script>

<template>
  <span
    ref="container"
    class="container flex items-center overflow-hidden"
    @mouseenter="handleOverflow"
  >
    <span ref="content" class="content"><slot /></span>
  </span>
</template>

<style scoped>
@keyframes slide {
  50% {
    transform: translateX(var(--distance));
  }
}

.slide:hover .content {
  animation: slide var(--duration) linear;
}

.container:not(:hover) .content {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
</style>
