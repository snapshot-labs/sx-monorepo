<script setup lang="ts">
import { RouteLocationNamedRaw } from 'vue-router';
import { hexToRgb } from '@/helpers/utils';

const props = defineProps<{
  label: string;
  color: string;
  to?: RouteLocationNamedRaw;
}>();

const { currentTheme } = useTheme();

const colorProperties = computed(() => checkColorProximity(props.color));

function checkColorProximity(color: string): {
  backgroundColor?: string;
  showBorder: boolean;
  textColor: string;
} {
  // if color is not a hex color, return default colors
  if (!color.match(/^#[0-9A-F]{6}$/)) {
    return {
      showBorder: true,
      backgroundColor: currentTheme.value === 'dark' ? '#000000' : '#FFFFFF',
      textColor: currentTheme.value === 'dark' ? '#FFFFFF' : '#000000'
    };
  }
  const hex = color.replace('#', '');
  const { r, g, b } = hexToRgb(hex);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const nearToWhite = r > 200 && g > 200 && b > 200;
  const nearToBlack = r < 55 && g < 55 && b < 55;
  const textColor = brightness > 155 ? '#000000' : '#FFFFFF';
  return {
    showBorder:
      (currentTheme.value === 'dark' && nearToBlack) ||
      (currentTheme.value === 'light' && nearToWhite),
    backgroundColor: color,
    textColor
  };
}
</script>

<template>
  <AppLink
    :to="to"
    class="rounded-full w-fit max-w-[220px] shrink-0 flex"
    :class="{
      border: colorProperties.showBorder
    }"
    :style="{
      backgroundColor: colorProperties.backgroundColor,
      color: colorProperties.textColor
    }"
  >
    <span
      class="truncate text-sm leading-[11px] whitespace-nowrap px-2 py-[6px]"
      v-text="label"
    />
  </AppLink>
</template>
