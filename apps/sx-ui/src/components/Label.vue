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
      'sticky z-10 top-[71px] lg:top-[72px] bg-skin-bg': sticky
    }"
    v-text="label"
  />
</template>
