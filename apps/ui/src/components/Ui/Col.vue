<script setup lang="ts">
import { computed, CSSProperties } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Vertical gap between children (in pixels or Tailwind spacing) */
    gap?: number | string;
    /** Horizontal alignment of children */
    align?: 'start' | 'center' | 'end' | 'stretch';
    /** Vertical alignment/distribution of children */
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    /** Column span for grid layouts (1-12) */
    span?: number;
    /** Width of the column */
    width?: string | number;
    /** Padding inside the column */
    padding?: number | string;
    /** Border radius */
    radius?: number | string;
    /** Background color */
    background?: string;
    /** Whether the column should grow to fill available space */
    grow?: boolean;
    /** Whether the column should shrink if needed */
    shrink?: boolean;
    /** Flex basis */
    basis?: string;
  }>(),
  {
    gap: 0,
    align: 'stretch',
    justify: 'start',
    grow: false,
    shrink: true
  }
);

const colClasses = computed(() => {
  const classes: string[] = ['ui-col'];

  // Alignment classes
  const alignMap = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };
  classes.push(alignMap[props.align]);

  // Justify classes
  const justifyMap = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };
  classes.push(justifyMap[props.justify]);

  // Flex grow/shrink
  if (props.grow) classes.push('flex-grow');
  if (!props.shrink) classes.push('flex-shrink-0');

  // Grid span (Tailwind col-span-*)
  if (props.span) {
    classes.push(`col-span-${props.span}`);
  }

  return classes.join(' ');
});

const colStyles = computed<CSSProperties>(() => {
  const styles: CSSProperties = {};

  // Gap handling
  if (props.gap) {
    if (typeof props.gap === 'number') {
      styles.gap = `${props.gap}px`;
    } else {
      styles.gap = props.gap;
    }
  }

  // Width handling
  if (props.width) {
    if (typeof props.width === 'number') {
      styles.width = `${props.width}px`;
    } else {
      styles.width = props.width;
    }
  }

  // Padding handling
  if (props.padding) {
    if (typeof props.padding === 'number') {
      styles.padding = `${props.padding}px`;
    } else {
      styles.padding = props.padding;
    }
  }

  // Border radius handling
  if (props.radius) {
    if (typeof props.radius === 'number') {
      styles.borderRadius = `${props.radius}px`;
    } else {
      styles.borderRadius = props.radius;
    }
  }

  // Background handling
  if (props.background) {
    styles.background = props.background;
  }

  // Flex basis
  if (props.basis) {
    styles.flexBasis = props.basis;
  }

  return styles;
});
</script>

<template>
  <div :class="colClasses" :style="colStyles">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.ui-col {
  display: flex;
  flex-direction: column;
}
</style>
