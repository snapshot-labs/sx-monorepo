<script setup lang="ts">
import { MenuItem } from '@headlessui/vue';

defineProps<{
  disabled?: boolean;
}>();
</script>

<template>
  <MenuItem
    v-slot="{ active }"
    :disabled="disabled"
    as="template"
    class="w-full px-3 py-2 text-sm whitespace-nowrap"
  >
    <slot :active="active" :disabled="disabled" />
  </MenuItem>
</template>
