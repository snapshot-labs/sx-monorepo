<script setup lang="ts">
import { Space } from '@/types';

const props = defineProps<{
  space: Space;
}>();

const spaceIdComposite = `${props.space.network}:${props.space.id}`;

const { isSafeWallet } = useSafeWallet(props.space.network, props.space.snapshot_chain_id);
const followedSpacesStore = useFollowedSpacesStore();
const { web3 } = useWeb3();

const spaceFollowed = computed(() => followedSpacesStore.isFollowed(spaceIdComposite));
const hidden = computed(() => web3.value?.type === 'argentx');

const loading = computed(
  () =>
    !followedSpacesStore.followedSpacesLoaded ||
    followedSpacesStore.followedSpaceLoading.has(spaceIdComposite)
);
</script>

<template>
  <UiButton
    v-if="!hidden"
    :loading="loading"
    :disabled="loading || isSafeWallet"
    class="group !px-0"
    :class="{ 'hover:border-skin-danger': spaceFollowed }"
    @click.prevent="followedSpacesStore.toggleSpaceFollow(spaceIdComposite)"
  >
    <span v-if="spaceFollowed" class="px-3.5">
      <span class="group-hover:inline hidden text-skin-danger">Unfollow</span>
      <span class="group-hover:hidden">Following</span>
    </span>
    <span v-else class="px-3.5">Follow</span>
  </UiButton>
</template>
