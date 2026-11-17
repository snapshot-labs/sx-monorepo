<script lang="ts" setup>
import { PLAN_BADGE_CLASSES } from '@/helpers/constants';

const props = defineProps<{
  verified: boolean;
  turbo: boolean;
  flagged: boolean;
  // Pro features come from Snapshot Plus credits, not a subscription
  plus?: boolean;
}>();

const badgeLabel = computed(() => {
  if (props.turbo) return props.plus ? 'Snapshot Plus' : 'Snapshot Pro';
  if (props.verified) return 'Verified';
  if (props.flagged) return 'Flagged space';
  return '';
});
</script>

<template>
  <UiTooltip v-if="badgeLabel" :title="badgeLabel">
    <IS-badge-check
      v-if="turbo"
      :class="PLAN_BADGE_CLASSES[plus ? 'plus' : 'pro']"
    />
    <IS-badge-check v-else-if="verified" class="text-skin-link" />
    <IS-exclamation-circle v-else-if="flagged" class="text-skin-danger" />
  </UiTooltip>
</template>
