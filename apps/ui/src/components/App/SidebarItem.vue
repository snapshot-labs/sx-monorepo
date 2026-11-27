<script setup lang="ts">
import { resolveSpaceItem } from '@/helpers/organizations';
import { Space } from '@/types';

const props = defineProps<{
  space: Space;
}>();

const item = computed(() => resolveSpaceItem(props.space));
</script>

<template>
  <AppLink :to="item.link" class="block">
    <!-- The tooltip's text renders in <body>, so this names the link -->
    <span class="sr-only" v-text="item.title" />
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
