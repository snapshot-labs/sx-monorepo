<script setup lang="ts">
import { computed, CSSProperties } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Horizontal gap between children (in pixels or Tailwind spacing) */
    gap?: number | string;
    /** Vertical alignment of children */
    align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
    /** Horizontal alignment/distribution of children */
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    /** Whether children should wrap to next line */
    wrap?: boolean | 'reverse';
    /** Width of the row */
    width?: string | number;
    /** Padding inside the row */
    padding?: number | string;
    /** Border radius */
    radius?: number | string;
    /** Background color */
    background?: string;
    /** Whether the row should grow to fill available space */
    grow?: boolean;
    /** Whether the row should shrink if needed */
    shrink?: boolean;
    /** Flex basis */
    basis?: string;
  }>(),
  {
    gap: 0,
    align: 'stretch',
    justify: 'start',
    wrap: false,
    grow: false,
    shrink: true
  }
);

const rowClasses = computed(() => {
  const classes: string[] = ['ui-row'];

  // Alignment classes
  const alignMap = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
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

  // Wrap classes
  if (props.wrap === true) {
    classes.push('flex-wrap');
  } else if (props.wrap === 'reverse') {
    classes.push('flex-wrap-reverse');
  } else {
    classes.push('flex-nowrap');
  }

  // Flex grow/shrink
  if (props.grow) classes.push('flex-grow');
  if (!props.shrink) classes.push('flex-shrink-0');

  return classes.join(' ');
});

const rowStyles = computed<CSSProperties>(() => {
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
  <div :class="rowClasses" :style="rowStyles">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.ui-row {
  display: flex;
  flex-direction: row;
}
</style>
