<script setup lang="ts">
withDefaults(
  defineProps<{
    encrypted: boolean;
    iconOnly?: boolean;
  }>(),
  { encrypted: false, iconOnly: false }
);
</script>

<template>
  <div
    v-if="encrypted"
    v-tippy="{
      content:
        'This proposal has Shutter privacy enabled. All votes will be encrypted until the voting period has ended and the final score calculated'
    }"
    class="cursor-help flex items-center gap-1"
  >
    <i-h-lock-closed />
    <span v-if="!iconOnly">Encrypted</span>
  </div>

  <template v-else>
    <slot />
  </template>
</template>
