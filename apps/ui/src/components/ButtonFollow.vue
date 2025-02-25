<script setup lang="ts">
import { NetworkID } from '@/types';

const props = defineProps<{
  space: { id: string; network: NetworkID; snapshot_chain_id?: number };
}>();

const { isSafeWallet } = useSafeWallet(
  props.space.network,
  props.space.snapshot_chain_id
);
const followedSpacesStore = useFollowedSpacesStore();
const { isWhiteLabel } = useWhiteLabel();
const uiStore = useUiStore();

const spaceIdComposite = computed(
  () => `${props.space.network}:${props.space.id}`
);

const spaceFollowed = computed(() =>
  followedSpacesStore.isFollowed(spaceIdComposite.value)
);

const loading = computed(
  () =>
    !followedSpacesStore.followedSpacesLoaded ||
    followedSpacesStore.followedSpaceLoading.has(spaceIdComposite.value)
);

const maxFollowLimitReached = computed(
  () =>
    followedSpacesStore.followedSpaces.length >=
    followedSpacesStore.maxFollowLimit
);

const preventFollowingMore = computed(
  () => maxFollowLimitReached.value && !spaceFollowed.value
);

const tooltipMessage = computed(() => {
  if (preventFollowingMore.value) {
    return `You can follow up to ${followedSpacesStore.maxFollowLimit} spaces.`;
  }

  if (isSafeWallet.value) {
    return 'Safe wallets cannot follow spaces.';
  }

  return '';
});

async function handleClick() {
  try {
    await followedSpacesStore.toggleSpaceFollow(spaceIdComposite.value);
  } catch (error) {
    uiStore.addNotification('error', error.message);
  }
}
</script>

<template>
  <UiTooltip :title="tooltipMessage">
    <UiButton
      v-if="!isWhiteLabel"
      :disabled="loading || isSafeWallet || preventFollowingMore"
      class="group"
      :class="{ 'hover:border-skin-danger': spaceFollowed }"
      :loading="loading"
      @click.prevent="handleClick"
    >
      <span v-if="spaceFollowed" class="inline-block">
        <span class="group-hover:inline hidden text-skin-danger">Unfollow</span>
        <span class="group-hover:hidden">Following</span>
      </span>
      <span v-else class="inline-block">Follow</span>
    </UiButton>
  </UiTooltip>
</template>
