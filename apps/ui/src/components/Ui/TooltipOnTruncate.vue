<script setup lang="ts">
const props = defineProps<{
  content?: string;
}>();

const wrapperRef = ref<HTMLElement | null>(null);
const isTruncated = ref(false);

const tooltipContent = computed(() => {
  return props.content || wrapperRef.value?.textContent || '';
});

const checkTruncation = () => {
  if (!wrapperRef.value) return;
  isTruncated.value =
    wrapperRef.value.scrollWidth > wrapperRef.value.clientWidth;
};

const debouncedCheckTruncation = useDebounceFn(checkTruncation, 50);

useResizeObserver(wrapperRef, debouncedCheckTruncation);

watchEffect(() => {
  if (wrapperRef.value) {
    checkTruncation();
  }
});
</script>

<template>
  <div
    ref="wrapperRef"
    v-tippy="{
      content: isTruncated ? tooltipContent : null
    }"
    class="inline-block relative grow truncate"
  >
    <slot>{{ content }}</slot>
  </div>
</template>
