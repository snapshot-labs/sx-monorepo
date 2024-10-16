<script setup lang="ts">
const props = defineProps<{
  label: string;
  color: string;
}>();

const { currentMode } = useUserSkin();

const colorProperties = computed(() => checkColorProximity(props.color));

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

function checkColorProximity(color: string): {
  backgroundColor?: string;
  showBorder: boolean;
  textColor: string;
} {
  // if color is not a hex color, return default colors
  if (!color.match(/^#[0-9A-F]{6}$/)) {
    return {
      showBorder: true,
      backgroundColor: currentMode.value === 'dark' ? '#000000' : '#FFFFFF',
      textColor: currentMode.value === 'dark' ? '#FFFFFF' : '#000000'
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
      (currentMode.value === 'dark' && nearToBlack) ||
      (currentMode.value === 'light' && nearToWhite),
    backgroundColor: color,
    textColor
  };
}
</script>

<template>
  <div
    class="px-2 py-[6px] rounded-full leading-3 whitespace-nowrap truncate w-fit max-w-[220px] shrink-0"
    :class="{
      border: colorProperties.showBorder
    }"
    :style="{
      backgroundColor: colorProperties.backgroundColor,
      color: colorProperties.textColor
    }"
    v-text="props.label"
  />
</template>
