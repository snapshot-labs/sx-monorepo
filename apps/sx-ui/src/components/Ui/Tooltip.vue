<script setup lang="ts">
import { useFloating, autoUpdate, offset, flip, shift, arrow, Placement } from '@floating-ui/vue';

const props = withDefaults(
  defineProps<{
    title: string;
    position?: Placement;
  }>(),
  {
    position: 'top'
  }
);

const referenceRef = ref(null);
const floatingRef = ref(null);
const arrowRef = ref(null);
const visible = ref(false);

const { placement, x, y, strategy, middlewareData } = useFloating(referenceRef, floatingRef, {
  placement: props.position,
  whileElementsMounted: autoUpdate,
  middleware: [offset(10), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })]
});

const arrowStyle = computed(() => {
  if (!middlewareData.value.arrow) return {};

  const opposedSide = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top'
  }[placement.value.split('-')[0] as Placement];

  const { x, y } = middlewareData.value.arrow;

  return {
    left: x != null ? `${x}px` : '',
    top: y != null ? `${y}px` : '',
    [opposedSide]: '-4px'
  };
});
</script>

<template>
  <div class="inline-block relative">
    <div
      ref="referenceRef"
      class="h-full"
      @mouseenter="visible = true"
      @mouseleave="visible = false"
    >
      <slot />
    </div>
    <div
      ref="floatingRef"
      :style="{
        position: strategy,
        top: `${y ?? 0}px`,
        left: `${x ?? 0}px`
      }"
      class="bg-skin-border text-skin-link px-3 py-2 w-max z-50 rounded text-sm leading-5 transition-opacity"
      :class="[visible ? 'opacity-100' : 'scale-0 opacity-0']"
    >
      {{ title }}

      <div
        ref="arrowRef"
        :style="arrowStyle"
        class="absolute bg-skin-border w-[8px] h-[8px] rotate-45"
      />
    </div>
  </div>
</template>
