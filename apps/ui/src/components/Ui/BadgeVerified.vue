<script lang="ts" setup>
defineProps<{
  verified: boolean;
  turbo: boolean;
}>();
</script>

<template>
  <UiTooltip v-if="turbo || verified" title="Verified space">
    <IS-badge-check v-if="turbo" class="ml-1 text-[#e2b719]" />
    <IS-badge-check v-else-if="verified" class="ml-1 text-[#2394ea]" />
  </UiTooltip>
</template>
