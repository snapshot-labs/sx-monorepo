<script setup lang="ts">
import {
  getOrganizationConfigBySpace,
  resolveSpaceItem
} from '@/helpers/organizations';
import { Space } from '@/types';

const props = defineProps<{
  space: Space;
}>();

const followedSpacesStore = useFollowedSpacesStore();

const org = computed(() =>
  getOrganizationConfigBySpace(`${props.space.network}:${props.space.id}`)
);

const item = computed(() => {
  const resolved = resolveSpaceItem(props.space, org.value);

  if (!org.value) return resolved;

  // `resolveSpaceItem` can't know the org total, so it leaves a placeholder 0.
  return {
    ...resolved,
    avatarSpace: {
      ...resolved.avatarSpace,
      active_proposals:
        followedSpacesStore.orgActiveProposals[org.value.id] ?? 0
    }
  };
});
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
