<script setup lang="ts">
import { Menu, MenuContent, MenuTrigger } from '@ui-sdk/vue/menu';
import SlotRoot from '../../helpers/SlotRoot';

// In <body> like Headless UI's Float did, so the menu inherits the body's text
// styles instead of whatever surrounds the trigger
const container = document.body;

withDefaults(
  defineProps<{
    disabled?: boolean;
    gap?: string;
    placement?: 'start' | 'end';
  }>(),
  {
    disabled: false,
    gap: '8',
    placement: 'end'
  }
);
</script>

<template>
  <div class="relative">
    <!-- modal=false: an outside click also reaches what it hits, like before -->
    <Menu :modal="false" :container="container">
      <MenuTrigger :disabled="disabled">
        <template #render="{ props }">
          <SlotRoot
            v-bind="props"
            class="cursor-pointer [&_svg]:pointer-events-none"
          >
            <slot name="button" />
          </SlotRoot>
        </template>
      </MenuTrigger>
      <MenuContent
        side="bottom"
        :align="placement"
        :side-offset="Number(gap)"
        :collision-padding="0"
        class="m-0 border-0 p-0 rounded-md bg-skin-border text-skin-link shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden transition duration-100 ease-out data-[ending-style]:duration-75 data-[ending-style]:ease-in data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
      >
        <div class="max-h-[208px] overflow-y-auto py-1">
          <slot name="items" />
        </div>
      </MenuContent>
    </Menu>
  </div>
</template>
