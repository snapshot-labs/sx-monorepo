<script lang="ts" setup>
const wrapperEl = ref<HTMLDivElement | null>(null);
const lastScrollY = ref(0);
const initialTopOffset = ref<number | null>(null);
const topOffset = ref(0);
const init = ref<boolean>(false);

function positionAffix() {
  if (!wrapperEl.value) return;

  const innerEl = wrapperEl.value.getElementsByTagName(
    'div'
  )[0] as HTMLDivElement;
  const windowHeight = window.innerHeight;
  const innerHeight = innerEl.getBoundingClientRect().height;
  const innerBottom = innerEl.getBoundingClientRect().bottom;
  const scrollOffset = window.scrollY - lastScrollY.value;
  const scrollDirection = lastScrollY.value > window.scrollY ? 'up' : 'down';

  lastScrollY.value = window.scrollY;

  if (!init.value) {
    initialTopOffset.value = wrapperEl.value.getBoundingClientRect().top;
    topOffset.value = initialTopOffset.value;
    innerEl.classList.add('static', 'md:sticky');
    init.value = true;
  }

  if (innerBottom >= windowHeight) {
    const newTopOffset = topOffset.value - scrollOffset;

    if (scrollDirection === 'down' && innerBottom > windowHeight) {
      topOffset.value = Math.max(newTopOffset, -(innerHeight - windowHeight));
    } else if (scrollDirection === 'up') {
      topOffset.value = Math.min(newTopOffset, initialTopOffset.value!);
    }
  } else {
    topOffset.value = initialTopOffset.value!;
  }

  innerEl.style.top = `${topOffset.value}px`;
}

onMounted(() => {
  positionAffix();
  window.addEventListener('scroll', positionAffix);
  window.addEventListener('resize', positionAffix);
});

onUnmounted(() => {
  window.removeEventListener('scroll', positionAffix);
  window.removeEventListener('resize', positionAffix);
});
</script>

<template>
  <div ref="wrapperEl">
    <slot />
  </div>
</template>
