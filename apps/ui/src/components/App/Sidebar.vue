<script setup lang="ts">
import { Space } from '@/types';

const followedSpacesStore = useFollowedSpacesStore();
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
    <UiReorderList
      v-else
      v-model="followedSpacesStore.followedSpaces"
      :touch-delay="100"
      :item-key="(space: Space) => `${space.network}:${space.id}`"
      animated
      class="space-y-3 p-2 no-scrollbar overscroll-contain overflow-auto pb-3"
    >
      <template #item="{ element }">
        <AppSidebarItem :space="element" />
      </template>
    </UiReorderList>
  </div>
</template>
