<script setup lang="ts">
import { Space } from '@/types';

defineProps<{ spaces: Space[]; gap?: string; placement?: 'start' | 'end' }>();

function getEditorRoute(s: Space) {
  return {
    name: 'space-editor',
    params: { space: `${s.network}:${s.id}` }
  };
}
</script>

<template>
  <UiTooltip title="New proposal">
    <UiButton
      v-if="spaces.length === 1"
      :to="getEditorRoute(spaces[0])"
      uniform
    >
      <IH-pencil-alt />
    </UiButton>
    <UiDropdown v-else :gap="gap" :placement="placement">
      <template #button>
        <UiButton uniform>
          <IH-pencil-alt />
        </UiButton>
      </template>
      <template #items>
        <UiDropdownItem
          v-for="s in spaces"
          :key="`${s.network}:${s.id}`"
          :to="getEditorRoute(s)"
        >
          <slot name="label" :space="s">{{ s.name }}</slot>
        </UiDropdownItem>
      </template>
    </UiDropdown>
  </UiTooltip>
</template>
