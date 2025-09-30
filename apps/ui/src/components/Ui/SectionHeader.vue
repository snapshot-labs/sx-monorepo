<script setup lang="ts">
defineProps<{
  label: string;
  sticky?: boolean;
}>();
</script>

<template>
  <h4
    :class="[
      'eyebrow border-b py-2 px-4 text-skin-text',
      sticky
        ? 'sticky z-10 top-sticky-header lg:top-sticky-header-lg bg-skin-bg'
        : ''
    ]"
    v-text="label"
  />
</template>
