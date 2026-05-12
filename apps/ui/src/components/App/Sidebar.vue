<script setup lang="ts">
import { getOrganizationConfigBySpace } from '@/helpers/organizations';
import type { Space } from '@/types';
import type { RouteLocationRaw } from 'vue-router';
import draggable from 'vuedraggable';

const followedSpacesStore = useFollowedSpacesStore();

function getSpaceLink(space: Space): RouteLocationRaw {
  const org = getOrganizationConfigBySpace(`${space.network}:${space.id}`);

  if (org) return { name: 'org', params: { org: org.id } };

  return {
    name: 'space-overview',
    params: { space: `${space.network}:${space.id}` }
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
        <AppLink :to="getSpaceLink(element)" class="block">
          <UiTooltip :title="element.name" placement="right">
            <SpaceAvatar
              show-active-proposals
              :space="element"
              :size="32"
              class="!rounded-[4px]"
            />
          </UiTooltip>
        </AppLink>
      </template>
    </draggable>
  </div>
</template>
