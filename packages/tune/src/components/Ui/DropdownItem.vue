<script setup lang="ts">
import { MenuItem } from '@ui-sdk/vue/menu';
import { TUNE_OPTIONS_KEY } from '../../plugin';

defineProps<{
  disabled?: boolean;
  danger?: boolean;
}>();

// Emitted on select: the menu only clicks links on Enter, so this keeps
// `@click` working from the keyboard too
const emit = defineEmits<{ click: [] }>();

const { linkComponent = 'button' } = inject(TUNE_OPTIONS_KEY, {});
</script>

<template>
  <MenuItem :disabled="disabled" @select="emit('click')">
    <template #render="{ props }">
      <component
        :is="linkComponent"
        v-bind="props"
        class="w-full px-3 py-1.5 leading-6 text-[17px] whitespace-nowrap flex items-center gap-2 data-[highlighted]:bg-skin-link/[.08]"
        :class="{
          'text-skin-danger': danger,
          'opacity-40 cursor-not-allowed': disabled
        }"
      >
        <slot />
      </component>
    </template>
  </MenuItem>
</template>
