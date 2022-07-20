<script setup>
const props = defineProps({
  item: Object,
  size: Number
});

function handleError(e) {
  const size = props.size ? props.size * 2 : 256;

  e.target.src = `https://cdn.stamp.fyi/token/${props.item.contract_address}?s=${size}`;
}
</script>

<template>
  <img
    :src="item.image"
    class="aspect-square rounded"
    :style="
      size
        ? {
            width: `${size}px`,
            height: `${size}px`
          }
        : {}
    "
    @error="handleError"
  />
</template>
