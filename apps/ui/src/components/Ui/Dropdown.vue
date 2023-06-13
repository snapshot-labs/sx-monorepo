<script setup lang="ts">
import { Menu, MenuButton, MenuItems } from '@headlessui/vue';
</script>

<template>
  <Menu as="div" class="relative">
    <MenuButton as="template" class="cursor-pointer">
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
        class="absolute right-0 mt-2 origin-top-right rounded-md bg-skin-border text-skin-link shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <slot name="items" />
      </MenuItems>
    </transition>
  </Menu>
</template>
