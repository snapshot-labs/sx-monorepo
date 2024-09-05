<script lang="ts" setup>
const wrapperEl = ref<HTMLDivElement | null>(null);
const initialTopOffset = ref<number | null>(null);
const lastScrollY = ref(0);
const topOffset = ref(0);
const ticking = ref<boolean>(false);

const innerEl = computed(
  () => wrapperEl.value?.getElementsByTagName('div')[0] as HTMLDivElement
);

function updatePosition(scrollY: number) {
  ticking.value = false;

  if (!wrapperEl.value || !innerEl.value) return;

  const windowHeight = window.innerHeight;
  const innerHeight = innerEl.value.getBoundingClientRect().height;
  const innerBottom = innerEl.value.getBoundingClientRect().bottom;
  const scrollOffset = scrollY - lastScrollY.value;
  const scrollingDown = lastScrollY.value < scrollY;

  lastScrollY.value = scrollY;

  if (innerBottom >= windowHeight) {
    const newTopOffset = topOffset.value - scrollOffset;

    if (scrollingDown) {
      topOffset.value = Math.max(newTopOffset, -(innerHeight - windowHeight));
    } else {
      topOffset.value = Math.min(newTopOffset, initialTopOffset.value!);
    }
  } else {
    topOffset.value = initialTopOffset.value!;
  }

  innerEl.value.style.top = `${topOffset.value}px`;
}

function handlePositionUpdate() {
  if (!ticking.value) {
    requestAnimationFrame(() => updatePosition(window.scrollY));
  }
  ticking.value = true;
}

function init() {
  if (!wrapperEl.value) return;

  initialTopOffset.value = wrapperEl.value.getBoundingClientRect().top;
  topOffset.value = initialTopOffset.value;
  innerEl.value.classList.add('static', 'md:sticky');
}

onMounted(() => {
  init();
  updatePosition(window.scrollY);

  window.addEventListener('scroll', handlePositionUpdate);
  window.addEventListener('resize', handlePositionUpdate);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handlePositionUpdate);
  window.removeEventListener('resize', handlePositionUpdate);
});
</script>

<template>
  <div ref="wrapperEl">
    <slot />
  </div>
</template>
