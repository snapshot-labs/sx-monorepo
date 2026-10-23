<script lang="ts" setup>
const props = defineProps<{
  verified: boolean;
  turbo: boolean;
  flagged: boolean;
  // Pro features come from Snapshot Plus credits, not a subscription
  plus?: boolean;
}>();

const badgeLabel = computed(() => {
  if (props.turbo) return props.plus ? 'Snapshot Plus' : 'Pro space';
  if (props.verified) return 'Verified space';
  if (props.flagged) return 'Flagged space';
  return '';
});
</script>

<template>
  <UiTooltip v-if="badgeLabel" :title="badgeLabel">
    <IS-badge-check
      v-if="turbo"
      :class="plus ? 'text-[#a7adb5]' : 'text-[#e2b719]'"
    />
    <IS-badge-check v-else-if="verified" class="text-[#2394ea]" />
    <IS-exclamation-circle v-else-if="flagged" class="text-skin-danger" />
  </UiTooltip>
</template>
