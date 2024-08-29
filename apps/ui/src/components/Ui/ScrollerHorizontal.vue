<script setup lang="ts">
const emit = defineEmits<{
  (e: 'scroll', target: HTMLElement);
}>();

withDefaults(
  defineProps<{
    withButtons?: boolean;
    gradient?: false | 'sm' | 'md' | 'xxl';
  }>(),
  { withButtons: false, gradient: false }
);

const containerRef = ref<HTMLElement | null>(null);
const canScrollTabs = ref({ canScrollLeft: false, canScrollRight: false });

function handleScroll(target: HTMLElement) {
  canScrollTabs.value = {
    canScrollLeft: target.scrollLeft > 0,
    canScrollRight:
      Math.ceil(target.scrollLeft) < target.scrollWidth - target.clientWidth
  };
  emit('scroll', target);
}

function scroll(direction: 'left' | 'right') {
  if (!containerRef.value) return;

  containerRef.value.scrollBy({
    left: direction === 'right' ? 200 : -200,
    behavior: 'smooth'
  });
}

onMounted(() => {
  if (!containerRef.value) return;

  handleScroll(containerRef.value);

  new ResizeObserver(() => {
    if (!containerRef.value) return;
    handleScroll(containerRef.value);
  }).observe(containerRef.value);
});
</script>

<template>
  <div class="relative">
    <button
      v-if="gradient && (!withButtons || canScrollTabs.canScrollLeft)"
      type="button"
      tabindex="-1"
      :disabled="!withButtons"
      class="bg-gradient-to-r from-skin-bg left-0 top-[1px] bottom-[1px] absolute z-10"
      :class="{
        'flex items-center justify-start pl-4': withButtons,
        'pointer-events-none': !withButtons,
        'w-2': gradient === 'sm',
        'w-3': gradient === 'md',
        'w-[108px] via-70% via-skin-bg/85': gradient === 'xxl'
      }"
      @click="scroll('left')"
    >
      <IH-chevron-left v-if="withButtons" />
    </button>
    <div
      ref="containerRef"
      class="overflow-x-auto no-scrollbar"
      @scroll="e => e.target && handleScroll(e.target as HTMLElement)"
    >
      <div data-no-sidebar-swipe>
        <slot />
      </div>
    </div>
    <button
      v-if="gradient && (!withButtons || canScrollTabs.canScrollRight)"
      type="button"
      tabindex="-1"
      :disabled="!withButtons"
      class="bg-gradient-to-l from-skin-bg right-0 top-[1px] bottom-[1px] absolute z-10"
      :class="{
        'flex items-center justify-end pr-4': withButtons,
        'pointer-events-none': !withButtons,
        'w-2': gradient === 'sm',
        'w-3': gradient === 'md',
        'w-[108px] via-70% via-skin-bg/85': gradient === 'xxl'
      }"
      @click="scroll('right')"
    >
      <IH-chevron-right v-if="withButtons" />
    </button>
  </div>
</template>
