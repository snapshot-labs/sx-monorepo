<script setup lang="ts">
import { MenuItem } from '@headlessui/vue';

defineProps<{
  disabled?: boolean;
}>();
</script>

<template>
  <MenuItem v-slot="{ active }" :disabled="disabled" as="template">
    <AppLink
      class="w-full px-3 py-2 text-[17px] whitespace-nowrap flex items-center gap-2"
      :class="{
        'opacity-80': active,
        'opacity-40 cursor-not-allowed': disabled
      }"
    >
      <slot />
    </AppLink>
  </MenuItem>
</template>
