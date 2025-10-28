<script lang="ts" setup>
const props = defineProps<{
  verified: boolean;
  turbo: boolean;
  flagged: boolean;
}>();

const badgeLabel = computed(() => {
  if (props.turbo) return 'Pro space';
  if (props.verified) return 'Verified space';
  if (props.flagged) return 'Flagged space';
  return '';
});
</script>

<template>
  <UiTooltip v-if="badgeLabel" :title="badgeLabel">
    <IS-badge-check v-if="turbo" class="text-[#e2b719]" />
    <IS-badge-check v-else-if="verified" class="text-[#2394ea]" />
    <IS-exclamation-circle v-else-if="flagged" class="text-skin-danger" />
  </UiTooltip>
</template>
