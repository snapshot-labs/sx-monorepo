<script setup lang="ts">
import { resolveSpaceItem } from '@/helpers/organizations';
import type { Space } from '@/types';

const props = defineProps<{
  space: Space;
}>();

const item = computed(() => resolveSpaceItem(props.space));
</script>

<template>
  <AppLink :to="item.link" class="block">
    <UiTooltip :title="item.title" placement="right">
      <SpaceAvatar
        show-active-proposals
        :space="item.avatarSpace"
        :size="32"
        class="!rounded-[4px]"
      />
    </UiTooltip>
  </AppLink>
</template>
