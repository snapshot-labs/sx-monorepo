<script setup lang="ts">
import { NetworkID } from '@/types';

const props = defineProps<{
  space: { id: string; network: NetworkID; snapshot_chain_id?: number };
}>();

const spaceIdComposite = `${props.space.network}:${props.space.id}`;

const { isSafeWallet } = useSafeWallet(
  props.space.network,
  props.space.snapshot_chain_id
);
const followedSpacesStore = useFollowedSpacesStore();
const { isWhiteLabel } = useWhiteLabel();

const spaceFollowed = computed(() =>
  followedSpacesStore.isFollowed(spaceIdComposite)
);

const loading = computed(
  () =>
    !followedSpacesStore.followedSpacesLoaded ||
    followedSpacesStore.followedSpaceLoading.has(spaceIdComposite)
);
</script>

<template>
  <UiButton
    v-if="!isWhiteLabel"
    :disabled="loading || isSafeWallet"
    class="group"
    :class="{ 'hover:border-skin-danger': spaceFollowed }"
    :loading="loading"
    @click.prevent="followedSpacesStore.toggleSpaceFollow(spaceIdComposite)"
  >
    <span v-if="spaceFollowed" class="inline-block">
      <span class="group-hover:inline hidden text-skin-danger">Unfollow</span>
      <span class="group-hover:hidden">Following</span>
    </span>
    <span v-else class="inline-block">Follow</span>
  </UiButton>
</template>
