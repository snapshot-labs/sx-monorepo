<script setup lang="ts">
import UiTooltip from './Tooltip.vue';

const props = defineProps<{
  content?: string;
}>();

const wrapperRef = ref<InstanceType<typeof UiTooltip> | null>(null);
const isTruncated = ref(false);

const el = computed(() => wrapperRef.value?.$el ?? null);
const tooltipContent = computed(() => {
  return props.content || el.value?.textContent || '';
});

function checkTruncation() {
  const dom = el.value;
  if (!dom) return;
  isTruncated.value = dom.scrollWidth > dom.clientWidth;
}

const debouncedCheckTruncation = useDebounceFn(checkTruncation, 50);

useResizeObserver(el, debouncedCheckTruncation);
watch(tooltipContent, checkTruncation);
</script>

<template>
  <UiTooltip
    ref="wrapperRef"
    :title="isTruncated ? tooltipContent : ''"
    class="truncate"
  >
    <slot>{{ content }}</slot>
  </UiTooltip>
</template>
