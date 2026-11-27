<script setup lang="ts">
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaViewport
} from '@ui-sdk/vue/scroll-area';

const emit = defineEmits<{
  (e: 'scroll', target: HTMLElement): void;
}>();

withDefaults(
  defineProps<{
    withButtons?: boolean;
    gradient?: false | 'sm' | 'md' | 'xxl';
  }>(),
  { withButtons: false, gradient: false }
);

const viewport = ref<{ $el: HTMLElement } | null>(null);

function scroll(direction: 'left' | 'right') {
  viewport.value?.$el.scrollBy({
    left: direction === 'right' ? 200 : -200,
    behavior: 'smooth'
  });
}
</script>

<template>
  <!-- The caller's classes (like sticky) stay on our own root: UI SDK sets
  its root's position. It tracks the edges the gradients and buttons follow. -->
  <div class="relative">
    <ScrollArea v-slot="{ state }">
      <button
        v-if="gradient && (!withButtons || (state.overflowX && !state.atStart))"
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
      <ScrollAreaViewport
        ref="viewport"
        class="overflow-x-auto no-scrollbar"
        @scroll="(e: Event) => emit('scroll', e.target as HTMLElement)"
      >
        <!-- As wide as what it holds, so UI SDK sees tabs that grow later -->
        <ScrollAreaContent data-no-sidebar-swipe class="w-fit min-w-full">
          <slot />
        </ScrollAreaContent>
      </ScrollAreaViewport>
      <button
        v-if="gradient && (!withButtons || (state.overflowX && !state.atEnd))"
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
    </ScrollArea>
  </div>
</template>
