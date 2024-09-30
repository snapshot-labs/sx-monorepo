<script setup lang="ts">
const props = defineProps<{
  label: string;
  color: string;
}>();

const textColor = computed(() => {
  return isColorLight(props.color) ? '#000000' : '#FFFFFF';
});

function isColorLight(color) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}
</script>

<template>
  <div
    class="px-2 py-[6px] border rounded-full leading-3 whitespace-nowrap"
    :style="{ backgroundColor: color, color: textColor }"
    v-text="label"
  />
</template>
