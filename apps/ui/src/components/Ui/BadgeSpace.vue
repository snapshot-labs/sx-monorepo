<script lang="ts" setup>
defineProps<{
  verified: boolean;
  turbo: boolean;
  flagged: boolean;
}>();
</script>

<template>
  <UiTooltip
    v-if="turbo || verified || flagged"
    :title="flagged ? 'Flagged space' : 'Verified space'"
  >
    <IS-badge-check v-if="turbo" class="text-[#e2b719]" />
    <IS-badge-check v-else-if="verified" class="text-[#2394ea]" />
    <IS-exclamation-circle v-else-if="flagged" class="text-skin-danger" />
  </UiTooltip>
</template>
