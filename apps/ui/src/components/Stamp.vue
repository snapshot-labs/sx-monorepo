<script setup>
defineProps({
  type: {
    type: String,
    default: 'avatar'
  },
  id: String,
  size: {
    type: Number,
    default: 22
  }
});
</script>

<template>
  <img
    :src="`https://stamp.fyi/${type}/${id}?s=${size * 2}`"
    class="rounded-full inline-block bg-[color:var(--border-color)]"
    :style="{
      width: `${size}px`,
      height: `${size}px`
    }"
  />
</template>
