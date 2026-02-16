<script setup lang="ts">
defineProps<{
  counter: number;
}>();
</script>

<template>
  <div
    v-if="counter > 0"
    class="h-[18px] min-w-[18px] rounded-full leading-[18px] text-[13px] text-white bg-skin-text px-1 text-center inline-block"
    v-text="counter"
  />
</template>
