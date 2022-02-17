<script setup>
defineProps({
  address: String,
  size: {
    type: Number,
    default: 22
  }
});
</script>

<template>
  <img
    :src="`https://stamp.fyi/avatar/eth:${address}?s=${size * 2}`"
    class="rounded-full inline-block bg-[color:var(--border-color)]"
    :style="{
      width: `${size}px`,
      height: `${size}px`
    }"
  />
</template>
