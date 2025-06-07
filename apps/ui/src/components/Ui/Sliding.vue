<script setup lang="ts">
const containerRef = ref<HTMLElement>();

const checkOverflow = async () => {
  await nextTick();
  if (containerRef.value) {
    const container = containerRef.value;
    const content = container.querySelector(
      '.slide-text-content'
    ) as HTMLElement;

    if (content) {
      const containerWidth = container.getBoundingClientRect().width;
      const contentWidth = content.scrollWidth;

      if (contentWidth > containerWidth) {
        const translateDistance = contentWidth - containerWidth;
        const slideDuration = translateDistance / 50;
        const totalDuration = slideDuration * 2.5;

        container.style.setProperty(
          '--translate-distance',
          `-${translateDistance}px`
        );
        container.style.setProperty(
          '--animation-duration',
          `${totalDuration}s`
        );
        container.classList.add('can-slide');
      } else {
        container.classList.remove('can-slide');
      }
    }
  }
};

onMounted(() => checkOverflow());
</script>

<template>
  <span
    ref="containerRef"
    class="slide-text-container overflow-hidden item-center flex"
    @mouseenter="checkOverflow"
  >
    <span class="slide-text-content">
      <slot />
    </span>
  </span>
</template>

<style lang="scss" scoped>
@keyframes slide-and-return {
  0% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(var(--translate-distance));
  }
  50% {
    transform: translateX(var(--translate-distance));
  }
  100% {
    transform: translateX(0);
  }
}

.slide-text-container.can-slide:hover .slide-text-content {
  animation: slide-and-return var(--animation-duration) linear;
}

.slide-text-container:not(:hover) .slide-text-content {
  @apply text-ellipsis overflow-hidden w-full;
}
</style>
