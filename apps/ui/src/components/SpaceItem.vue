<script lang="ts" setup>
import { _n, getUrl } from '@/helpers/utils';
import { NetworkID, Space } from '@/types';
import { getNetwork } from '@/networks';

const props = defineProps<{ space: Space }>();

const currentNetwork = computed(() => {
  try {
    return getNetwork(props.space.network as NetworkID);
  } catch (e) {
    return null;
  }
});

const spacesStore = useSpacesStore();
</script>

<template>
  <router-link
    :to="{ name: 'space-overview', params: { id: `${space.network}:${space.id}` } }"
    class="text-skin-text border rounded-lg block h-[280px] relative group overflow-hidden"
  >
    <SpaceCover
      v-if="props.space.cover"
      :space="props.space"
      class="!rounded-none w-full h-[68px] object-cover absolute"
    />
    <div v-else class="!rounded-none w-full h-[68px] absolute bg-skin-border" />
    <div class="relative inline-block mx-4 mt-[34px]">
      <SpaceAvatar
        :space="space"
        :size="50"
        class="border-skin-bg !bg-skin-border rounded-md mb-2 border-[3px]"
      />
      <img
        :src="(currentNetwork && getUrl(currentNetwork.avatar)) ?? undefined"
        class="w-[16px] h-[16px] rounded-lg -right-[6px] bottom-0 absolute border"
      />
    </div>
    <button
      class="hidden group-hover:block absolute top-3 right-3 hover:text-skin-link"
      @click.prevent="spacesStore.toggleSpaceStar(`${space.network}:${space.id}`)"
    >
      <IS-star
        v-if="spacesStore.starredSpacesIds.includes(`${space.network}:${space.id}`)"
        class="inline-block"
      />
      <IH-star v-else class="inline-block" />
    </button>
    <div class="px-4">
      <h3 class="truncate mb-1" v-text="space.name" />
      <h5 class="line-clamp-2 leading-6" v-text="space.about" />
    </div>
    <h5 class="absolute bottom-4 px-4 text-sm">
      <b class="text-skin-link" v-text="_n(space.proposal_count)" /> proposals ·
      <b class="text-skin-link" v-text="_n(space.vote_count)" /> votes
    </h5>
  </router-link>
</template>
