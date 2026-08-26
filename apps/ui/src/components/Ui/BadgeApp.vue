<script setup lang="ts">
import { FunctionalComponent } from 'vue';
import ICRobot from '~icons/c/robot';
import IHSparkles from '~icons/heroicons-outline/sparkles';

const APPS: Record<string, { name: string; icon: FunctionalComponent }> = {
  'snapshot-mcp': { name: 'Snapshot MCP', icon: ICRobot },
  'snapshot-agent': { name: 'Snapshot Agentic Voting', icon: IHSparkles }
};

const props = defineProps<{
  app?: string;
}>();

const definition = computed(() => props.app && APPS[props.app]);
</script>

<template>
  <UiTooltip
    v-if="definition"
    :title="`Via ${definition.name}`"
    class="shrink-0 align-middle mr-1 text-skin-text"
  >
    <component :is="definition.icon" class="block size-[16px]" />
  </UiTooltip>
</template>
