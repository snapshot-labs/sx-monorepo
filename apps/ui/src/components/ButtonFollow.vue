<script setup lang="ts">
import { Space } from '@/types';

const props = defineProps<{
  space: Space;
}>();

const followedSpacesStore = useFollowedSpacesStore();

const spaceFollowed = computed(() =>
  followedSpacesStore.isFollowed(`${props.space.network}:${props.space.id}`)
);
</script>

<template>
  <UiButton disabled class="group" :class="{ 'hover:border-skin-danger': spaceFollowed }">
    <UiLoading v-if="!followedSpacesStore.followedSpacesLoaded" />
    <span v-else-if="spaceFollowed" class="inline-block">
      <span class="group-hover:inline hidden text-skin-danger">Unfollow</span>
      <span class="group-hover:hidden">Following</span>
    </span>
    <span v-else class="inline-block">Follow</span>
  </UiButton>
</template>
