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
  <UiTooltip
    v-if="encrypted"
    class="cursor-help"
    title="This proposal has Shutter privacy enabled. All votes will be encrypted until the voting period has ended and the final score is calculated"
  >
    <div class="flex items-center gap-1">
      <i-h-lock-closed />
      <span v-if="!iconOnly">Encrypted</span>
    </div>
  </UiTooltip>
  <template v-else>
    <slot />
  </template>
</template>
