<script setup lang="ts">
import { Space } from '@/types';
import { evmNetworks, offchainNetworks } from '@/networks';

// NOTE: Disabling on Starknet until we have support for starknet long addresses on sequencer
const SUPPORTED_NETWORKS = [...evmNetworks, ...offchainNetworks];

const props = defineProps<{
  space: Space;
}>();

const spaceIdComposite = `${props.space.network}:${props.space.id}`;

const { isSafeWallet } = useSafeWallet(props.space.network, props.space.snapshot_chain_id);
const followedSpacesStore = useFollowedSpacesStore();
const { web3 } = useWeb3();

const spaceFollowed = computed(() => followedSpacesStore.isFollowed(spaceIdComposite));
const hidden = computed(
  () => web3.value?.type === 'argentx' || !SUPPORTED_NETWORKS.includes(props.space.network)
);

const loading = computed(
  () =>
    !followedSpacesStore.followedSpacesLoaded ||
    followedSpacesStore.followedSpaceLoading.has(spaceIdComposite)
);
</script>

<template>
  <UiButton
    v-if="!hidden"
    :disabled="loading || isSafeWallet"
    class="group"
    :class="{ 'hover:border-skin-danger': spaceFollowed }"
    @click.prevent="followedSpacesStore.toggleSpaceFollow(spaceIdComposite)"
  >
    <UiLoading v-if="loading" />
    <span v-else-if="spaceFollowed" class="inline-block">
      <span class="group-hover:inline hidden text-skin-danger">Unfollow</span>
      <span class="group-hover:hidden">Following</span>
    </span>
    <span v-else class="inline-block">Follow</span>
  </UiButton>
</template>
