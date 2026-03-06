<script lang="ts" setup>
enum StickStatus {
  TOP,
  SCROLL,
  BOTTOM
}

const props = withDefaults(
  defineProps<{
    top?: number;
    bottom?: number;
  }>(),
  {
    top: 0,
    bottom: 0
  }
);

const wrapperEl = ref<HTMLDivElement | null>(null);
const lastScrollY = ref(0);
const isTicking = ref<boolean>(false);
const stickStatus = ref<StickStatus>(StickStatus.SCROLL);

const el = computed(
  () => wrapperEl.value?.getElementsByTagName('div')[0] as HTMLDivElement
);

function updatePosition(scrollY: number) {
  isTicking.value = false;

  if (!el.value) return;

  const isBottomReached =
    Math.round(el.value.getBoundingClientRect().bottom) + props.bottom <=
    window.innerHeight;
  const isTopReached =
    Math.round(el.value.getBoundingClientRect().top) >= props.top;
  const isScrollingDown = lastScrollY.value < scrollY;
  const isScrollingUp = lastScrollY.value > scrollY;
  const isStuckToBottom = stickStatus.value === StickStatus.BOTTOM;
  const isStuckToTop = stickStatus.value === StickStatus.TOP;
  const canScroll = !isTopReached || !isBottomReached;

  if (isScrollingDown && !isStuckToBottom && canScroll) {
    changeStickStatus(
      isBottomReached ? StickStatus.BOTTOM : StickStatus.SCROLL
    );
  } else if (isScrollingUp && !isStuckToTop) {
    changeStickStatus(isTopReached ? StickStatus.TOP : StickStatus.SCROLL);
  }

  lastScrollY.value = scrollY;
}

function changeStickStatus(status: StickStatus) {
  if (status === stickStatus.value) return;

  if (status === StickStatus.SCROLL) unstick();
  else if (status === StickStatus.TOP) stickToTop();
  else if (status === StickStatus.BOTTOM) stickToBottom();

  stickStatus.value = status;
}

function stickToBottom() {
  const offset =
    window.innerHeight - props.bottom - el.value.getBoundingClientRect().height;

  el.value.style.position = 'sticky';
  el.value.style.top = `${offset}px`;
}

function stickToTop() {
  el.value.style.position = 'sticky';
  el.value.style.top = `${props.top}px`;
}

function unstick() {
  const offset = el.value.offsetTop;

  el.value.style.position = 'relative';
  el.value.style.top = `${offset}px`;
}

function handlePositionUpdate() {
  if (!isTicking.value) {
    requestAnimationFrame(() => updatePosition(window.scrollY));
  }
  isTicking.value = true;
}

onMounted(() => {
  changeStickStatus(StickStatus.TOP);
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
  <div ref="wrapperEl" class="relative h-full">
    <slot />
  </div>
</template>
