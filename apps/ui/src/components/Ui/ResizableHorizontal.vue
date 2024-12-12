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
const sliderOriginalPositionX = ref(0);

const { x, y } = useDraggable(sliderEl, {
  axis: 'x',
  onStart: () => {
    dragging.value = true;
  },
  onEnd: () => {
    dragging.value = false;
  }
});

const containerWidth = computed(() => {
  const newWidth = Math.round(
    width.value + sliderOriginalPositionX.value - x.value
  );

  if (props.max && newWidth > props.max) return props.max;
  if (props.min && newWidth < props.min) return props.min;

  return newWidth;
});

function initResizer() {
  if (!sliderEl.value || !containerEl.value) return;

  const position = sliderEl.value.getBoundingClientRect();

  sliderOriginalPositionX.value = position.x;
  x.value = position.x;
  y.value = position.y;
  initialized.value = true;
}

watch(containerWidth, w => {
  lsSet(`${props.id}.${CACHE_KEY_SUFFIX}`, w);
});

onMounted(() => {
  initResizer();
});
</script>

<template>
  <div
    ref="containerEl"
    class="relative max-md:!w-full"
    :style="{ width: `${containerWidth}px` }"
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
