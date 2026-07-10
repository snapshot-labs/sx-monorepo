<script setup lang="ts">
import { Space } from '@/types';

defineProps<{ spaces: Space[]; gap?: string; placement?: 'start' | 'end' }>();
</script>

<template>
  <UiTooltip title="New proposal">
    <UiDropdown :gap="gap" :placement="placement">
      <template #button>
        <UiButton uniform>
          <IH-pencil-alt />
        </UiButton>
      </template>
      <template #items>
        <UiDropdownItem
          v-for="s in spaces"
          :key="`${s.network}:${s.id}`"
          :to="{
            name: 'space-editor',
            params: { space: `${s.network}:${s.id}` }
          }"
        >
          <slot name="label" :space="s">{{ s.name }}</slot>
        </UiDropdownItem>
      </template>
    </UiDropdown>
  </UiTooltip>
</template>
