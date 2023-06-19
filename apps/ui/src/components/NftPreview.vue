<script setup>
import { getStampUrl } from '@/helpers/utils';

const props = defineProps({
  item: Object,
  size: Number
});

const fallbackUrl = computed(() =>
  getStampUrl('token', props.item.contractAddress, props.size ? props.size * 2 : 256)
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
