<script lang="ts" setup>
import { lsGet, lsSet } from '@/helpers/utils';

const CACHE_KEY_SUFFIX = 'width';

const props = defineProps<{
  id: string;
  default: number;
  max?: number;
  min?: number;
}>();

const containerEl = ref<HTMLElement | null>(null);
const sliderEl = ref<HTMLElement | null>(null);
const initialized = ref(false);
const dragging = ref(false);
const width = ref(lsGet(`${props.id}.${CACHE_KEY_SUFFIX}`, props.default));
const sliderOutOfBound = ref(false);
const skipNextDragTick = ref(false);

const { x, y } = useDraggable(sliderEl, {
  axis: 'x',
  onStart: () => {
    dragging.value = true;
  },
  onEnd: () => {
    dragging.value = false;
    if (sliderOutOfBound) {
      skipNextDragTick.value = true;
    }
  }
});

function getNewWidth(width: number, delta: number) {
  const newWidth = Math.round(width - delta);

  if (props.max && newWidth > props.max) {
    sliderOutOfBound.value = true;
    return props.max;
  }
  if (props.min && newWidth < props.min) {
    sliderOutOfBound.value = true;
    return props.min;
  }

  return newWidth;
}

function initResizer() {
  if (!sliderEl.value || !containerEl.value) return;

  const position = sliderEl.value.getBoundingClientRect();
  x.value = position.x;
  y.value = position.y;
  initialized.value = true;
}

watch(x, (newX, oldX) => {
  if (!initialized.value || !dragging.value) return;

  if (skipNextDragTick.value) {
    skipNextDragTick.value = false;
    sliderOutOfBound.value = false;
    return;
  }

  width.value = getNewWidth(width.value, newX - oldX);

  lsSet(`${props.id}.${CACHE_KEY_SUFFIX}`, width.value);
});

onMounted(() => {
  initResizer();
});
</script>

<template>
  <div
    ref="containerEl"
    class="relative max-md:!w-full"
    :style="{ width: `${width}px` }"
  >
    <div
      ref="sliderEl"
      :class="[
        'slider',
        {
          dragging: dragging
        }
      ]"
    />
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.slider {
  $sliderSize: 6px;

  @apply hidden md:block absolute h-full z-10 select-none left-[-#{calc($sliderSize / 2)}] w-[#{$sliderSize}];

  &:hover,
  &.dragging {
    @apply bg-skin-border cursor-col-resize;
  }
}
</style>
