<script setup lang="ts">
import { getOrganizationConfigBySpace } from '@/helpers/organizations';
import type { Space } from '@/types';
import type { RouteLocationRaw } from 'vue-router';
import draggable from 'vuedraggable';

const followedSpacesStore = useFollowedSpacesStore();

function getSpaceItem(space: Space) {
  const org = getOrganizationConfigBySpace(`${space.network}:${space.id}`);

  if (org) {
    return {
      link: { name: 'org', params: { org: org.id } } as RouteLocationRaw,
      title: org.name,
      avatarSpace: { ...org.spaceIds[0], avatar: '', active_proposals: 0 }
    };
  }

  return {
    link: {
      name: 'space-overview',
      params: { space: `${space.network}:${space.id}` }
    } as RouteLocationRaw,
    title: space.name,
    avatarSpace: space
  };
}
</script>

<template>
  <div class="flex flex-col border-r text-center">
    <AppLink :to="{ name: 'my-home' }" class="h-[72px] block">
      <IC-snapshot class="inline-block my-[22px] size-[28px] text-skin-link" />
    </AppLink>
    <div
      class="bg-gradient-to-b from-skin-bg top-[72px] h-[8px] w-[71px] absolute z-10"
    />
    <UiLoading v-if="!followedSpacesStore.followedSpacesLoaded" />
    <draggable
      v-else
      v-model="followedSpacesStore.followedSpaces"
      :delay="100"
      :delay-on-touch-only="true"
      :touch-start-threshold="35"
      :item-key="i => i"
      v-bind="{ animation: 200 }"
      class="space-y-3 p-2 no-scrollbar overscroll-contain overflow-auto pb-3"
    >
      <template #item="{ element }">
        <AppLink :to="getSpaceItem(element).link" class="block">
          <UiTooltip :title="getSpaceItem(element).title" placement="right">
            <SpaceAvatar
              show-active-proposals
              :space="getSpaceItem(element).avatarSpace"
              :size="32"
              class="!rounded-[4px]"
            />
          </UiTooltip>
        </AppLink>
      </template>
    </draggable>
  </div>
</template>
