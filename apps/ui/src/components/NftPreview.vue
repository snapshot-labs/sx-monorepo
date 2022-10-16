<script setup>
import { computed } from 'vue';

const props = defineProps({
  item: Object,
  size: Number
});

const fallbackUrl = computed(
  () =>
    `https://cdn.stamp.fyi/token/${props.item.contractAddress}?s=${
      props.size ? props.size * 2 : 256
    }`
);
const url = computed(() => props.item.image || fallbackUrl.value);

function handleError(e) {
  e.target.src = fallbackUrl.value;
}
</script>

<template>
  <img
    :src="url"
    class="aspect-square rounded bg-[color:var(--border-color)]"
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
