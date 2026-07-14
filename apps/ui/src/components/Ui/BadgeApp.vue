<script setup lang="ts">
const APP_NAMES: Record<string, string> = {
  'snapshot-mcp': 'Snapshot MCP'
};

const props = defineProps<{
  app?: string;
}>();

const appName = computed(() => props.app && APP_NAMES[props.app]);
</script>

<template>
  <UiTooltip
    v-if="appName"
    :title="`Via ${appName}`"
    class="shrink-0 align-middle mr-1 text-skin-text"
  >
    <IC-robot class="block size-[16px]" />
  </UiTooltip>
</template>
