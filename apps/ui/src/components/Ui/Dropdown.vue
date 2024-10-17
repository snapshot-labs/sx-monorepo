<script setup lang="ts">
import { Menu, MenuButton, MenuItems } from '@headlessui/vue';
import { Float } from '@headlessui-float/vue';

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
  <Menu as="div" class="relative">
    <Float
      :placement="`bottom-${placement}`"
      :offset="Number(gap)"
      portal
      z-index="10"
    >
      <MenuButton :disabled="disabled" as="template" class="cursor-pointer">
        <slot name="button" />
      </MenuButton>
      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <MenuItems
          class="rounded-md bg-skin-border text-skin-link shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden"
        >
          <div class="max-h-[208px] overflow-y-auto">
            <slot name="items" />
          </div>
        </MenuItems>
      </transition>
    </Float>
  </Menu>
</template>
