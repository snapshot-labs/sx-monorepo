<script setup>
defineProps({
  counter: Number
});
</script>

<template>
  <div
    v-if="counter > 0"
    v-text="counter"
    class="h-[18px] min-w-[18px] rounded-full leading-[18px] text-xs text-white bg-skin-text px-1 text-center inline-block"
  />
</template>
