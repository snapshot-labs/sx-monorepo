<script setup lang="ts">
defineProps<{
  label: string;
  sticky?: boolean;
}>();

const isElectron = !!process.env.ELECTRON;
</script>

<template>
  <h4
    :class="[
      'eyebrow border-b py-2 px-4 text-skin-text',
      sticky && isElectron
        ? 'sticky z-10 top-[103px] lg:top-[104px] bg-skin-bg'
        : sticky
          ? 'sticky z-10 top-[71px] lg:top-[72px] bg-skin-bg'
          : ''
    ]"
    v-text="label"
  />
</template>
