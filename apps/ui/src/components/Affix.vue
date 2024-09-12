<script lang="ts" setup>
enum StickStatus {
  TOP,
  SCROLL,
  BOTTOM
}

const props = withDefaults(
  defineProps<{
    top: number;
    bottom: number;
  }>(),
  {
    top: 0,
    bottom: 0
  }
);

const wrapperEl = ref<HTMLDivElement | null>(null);
const lastScrollY = ref(0);
const ticking = ref<boolean>(false);
const stickStatus = ref<StickStatus>(StickStatus.SCROLL);

const el = computed(
  () => wrapperEl.value?.getElementsByTagName('div')[0] as HTMLDivElement
);

function updatePosition(scrollY: number) {
  ticking.value = false;

  if (!el.value) return;

  const isBottomReached =
    el.value.getBoundingClientRect().bottom + props.bottom <=
    window.innerHeight;
  const isTopReached = el.value.getBoundingClientRect().top >= props.top;
  const scrollingDown = lastScrollY.value < scrollY;
  const scrollingUp = lastScrollY.value > scrollY;
  const stickedToBottom = stickStatus.value === StickStatus.BOTTOM;
  const stickedToTop = stickStatus.value === StickStatus.TOP;
  const canScroll = !isTopReached || !isBottomReached;

  if (scrollingDown && !stickedToBottom && canScroll) {
    changeStickStatus(
      isBottomReached ? StickStatus.BOTTOM : StickStatus.SCROLL
    );
  } else if (scrollingUp && !stickedToTop) {
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
  if (!ticking.value) {
    requestAnimationFrame(() => updatePosition(window.scrollY));
  }
  ticking.value = true;
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
  <div ref="wrapperEl" class="relative">
    <slot />
  </div>
</template>
