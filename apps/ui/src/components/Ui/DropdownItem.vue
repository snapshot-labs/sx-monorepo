<script setup lang="ts">
import { MenuItem } from '@headlessui/vue';

defineProps<{
  disabled?: boolean;
  danger?: boolean;
}>();
</script>

<template>
  <MenuItem v-slot="{ active }" :disabled="disabled" as="template">
    <AppLink
      class="w-full px-3 py-1.5 leading-6 text-[17px] whitespace-nowrap flex items-center gap-2"
      :class="{
        'bg-skin-link/[.08]': active,
        'text-skin-danger': danger,
        'opacity-40 cursor-not-allowed': disabled
      }"
    >
      <slot />
    </AppLink>
  </MenuItem>
</template>
