<script setup lang="ts">
defineProps<{
  label: string;
  sticky?: boolean;
}>();
</script>

<template>
  <h4
    class="eyebrow border-b py-2 px-4 text-skin-text"
    :class="{
      'sticky z-10 top-sticky-header lg:top-sticky-header-lg bg-skin-bg': sticky
    }"
    v-text="label"
  />
</template>
