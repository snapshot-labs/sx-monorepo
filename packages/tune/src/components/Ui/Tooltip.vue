<script setup lang="ts">
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipTrigger
} from '@ui-sdk/vue/tooltip';
import { Comment, mergeProps } from 'vue';
import type { VNode } from 'vue';
import SlotRoot from '../../helpers/SlotRoot';
import Button from './Button.vue';

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    title: string;
    placement?: 'top' | 'right' | 'bottom' | 'left';
  }>(),
  { placement: 'top' }
);

// In <body> like tippy did: content rendered next to the trigger would
// change sibling selectors (:last-child...) and layout around it
const container = document.body;

// The trigger element, for <UiTooltipOnTruncate> to measure
const el = shallowRef<HTMLElement | null>(null);
defineExpose({ el });

// On a single button, the button itself triggers it: agents then see one
// control, and a screen reader hears the title as the icon button's name
function isSoleButton(nodes: VNode[] = []) {
  const [node, ...others] = nodes.filter(node => node.type !== Comment);
  return !others.length && (node?.type === Button || node?.type === 'button');
}

// Else the trigger is a <div>: no button `type` (Tailwind's base styles give
// [type='button'] a native appearance), and a ref that also records the element
function triggerOverrides(partRef: unknown) {
  return {
    type: undefined,
    ref: (node: unknown) => {
      el.value = node as HTMLElement | null;
      if (typeof partRef === 'function') partRef(node);
    }
  };
}
</script>

<template>
  <Tooltip :delay="0" :disabled="!title" :container="container">
    <TooltipTrigger>
      <template #render="{ props }">
        <div
          v-if="isSoleButton($slots.default?.())"
          v-bind="$attrs"
          class="inline-block relative"
        >
          <SlotRoot v-bind="props"><slot /></SlotRoot>
        </div>
        <div
          v-else
          v-bind="mergeProps($attrs, props, triggerOverrides(props.ref))"
          :aria-label="title || undefined"
          class="inline-block relative"
        >
          <slot />
        </div>
      </template>
    </TooltipTrigger>
    <TooltipContent
      :side="placement"
      :side-offset="10"
      :collision-padding="5"
      class="bg-skin-border text-skin-link px-[14px] py-2 w-max max-w-[min(350px,calc(100vw-10px))] rounded text-[17px] leading-5 break-words"
    >
      <TooltipArrow class="tune-tooltip-arrow" />
      {{ title }}
    </TooltipContent>
  </Tooltip>
</template>

<style lang="scss">
// tippy.js's 16x8 arrow. UI SDK centers the arrow element on the trigger
// from its measured size, so it must be exactly 16px (Tune's spacing scale
// isn't Tailwind's: size-4 is 24px)
.tune-tooltip-arrow {
  @apply absolute text-skin-border;
  width: 16px;
  height: 16px;

  &::before {
    content: '';
    position: absolute;
    border-color: transparent;
    border-style: solid;
  }

  &[data-side='top'] {
    @apply bottom-0;

    &::before {
      bottom: -7px;
      left: 0;
      border-width: 8px 8px 0;
      border-top-color: currentColor;
    }
  }

  &[data-side='bottom'] {
    @apply top-0;

    &::before {
      top: -7px;
      left: 0;
      border-width: 0 8px 8px;
      border-bottom-color: currentColor;
    }
  }

  &[data-side='left'] {
    @apply right-0;

    &::before {
      right: -7px;
      border-width: 8px 0 8px 8px;
      border-left-color: currentColor;
    }
  }

  &[data-side='right'] {
    @apply left-0;

    &::before {
      left: -7px;
      border-width: 8px 8px 8px 0;
      border-right-color: currentColor;
    }
  }
}
</style>
