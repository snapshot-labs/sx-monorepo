<script lang="ts" setup>
const props = defineProps<{
  width: number;
  max?: number;
  min?: number;
}>();

const containerEl = ref<HTMLElement | null>(null);
const sliderEl = ref<HTMLElement | null>(null);
const initialized = ref(false);
const sliderOriginalPositionX = ref(0);

const { x, y } = useDraggable(sliderEl, {
  axis: 'x'
});

const containerWidth = computed(() => {
  const width = getWidth(x.value);

  if (props.max && width > props.max) return props.max;
  if (props.min && width < props.min) return props.min;

  return width;
});

function getWidth(newSliderPositionX: number): number {
  const offset = sliderOriginalPositionX.value - newSliderPositionX;

  return props.width + offset;
}

function initResizer() {
  if (!sliderEl.value || !containerEl.value) return;

  const position = sliderEl.value.getBoundingClientRect();

  sliderOriginalPositionX.value = position.x;
  x.value = position.x;
  y.value = position.y;
  initialized.value = true;
}

onMounted(() => {
  initResizer();
});
</script>

<template>
  <div ref="containerEl" :style="{ width: `${containerWidth}px` }">
    <div ref="sliderEl" class="slider" />
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

  &:hover {
    @apply bg-skin-border cursor-col-resize;
  }
}
</style>
