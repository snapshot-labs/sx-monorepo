<script lang="ts" setup>
import { _n } from '@/helpers/utils';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const spacesStore = useSpacesStore();
</script>

<template>
  <router-link
    :to="{ name: 'space-overview', params: { id: `${space.network}:${space.id}` } }"
    class="text-skin-text border rounded-lg block h-[280px] relative group overflow-hidden"
  >
    <SpaceCover :space="props.space" class="!rounded-none w-full h-[68px] absolute" />
    <div class="relative inline-block mx-4 mt-[34px]">
      <UiBadgeNetwork :id="space.network" class="mb-2">
        <SpaceAvatar
          :space="space"
          :size="50"
          class="border-skin-bg !bg-skin-border rounded-md border-[3px]"
        />
      </UiBadgeNetwork>
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
    <h5 class="absolute bottom-4 px-4 text-[17px]">
      <b class="text-skin-link" v-text="_n(space.proposal_count)" /> proposals ·
      <b class="text-skin-link" v-text="_n(space.vote_count)" /> votes
    </h5>
  </router-link>
</template>
