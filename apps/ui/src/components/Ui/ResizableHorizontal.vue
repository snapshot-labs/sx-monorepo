<script lang="ts" setup>
import { lsGet, lsSet } from '@/helpers/utils';

const CACHE_KEYNAME = 'proposal.sidebarWidth';

const props = defineProps<{
  default: number;
  max?: number;
  min?: number;
}>();

const containerEl = ref<HTMLElement | null>(null);
const sliderEl = ref<HTMLElement | null>(null);
const initialized = ref(false);
const sliderOriginalPositionX = ref(0);
const dragging = ref(false);
const width = ref(lsGet(CACHE_KEYNAME, props.default));

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
  const offset = sliderOriginalPositionX.value - x.value;
  const newWidth = width.value + offset;

  if (props.max && newWidth > props.max) return props.max;
  if (props.min && newWidth < props.min) return props.min;

  return Math.round(newWidth);
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
  lsSet(CACHE_KEYNAME, w);
});

onMounted(() => {
  initResizer();
});
</script>

<template>
  <div ref="containerEl" :style="{ width: `${containerWidth}px` }">
    <div ref="sliderEl" :class="['slider', { dragging: dragging }]" />
    <slot />
  </div>
</template>

<style scoped>
.slider {
  @apply block fixed z-[99] w-[5px] h-full ml-[-2px];

  &:before {
    @apply h-full border-l block ml-[2px];
    content: '';
  }

  &:hover,
  &.dragging {
    @apply bg-skin-border cursor-col-resize;
  }
}
</style>
