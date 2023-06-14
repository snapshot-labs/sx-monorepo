<script lang="ts" setup>
import { useSpacesStore } from '@/stores/spaces';
import { _n } from '@/helpers/utils';
import { Space } from '@/types';

defineProps<{ space: Space }>();

const spacesStore = useSpacesStore();
</script>

<template>
  <router-link
    :to="{ name: 'space-overview', params: { id: `${space.network}:${space.id}` } }"
    class="p-4 text-skin-text border rounded-lg block h-[240px] relative group"
  >
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
    <SpaceAvatar :space="space" :size="32" class="border-skin-bg !bg-skin-border rounded-sm mb-2" />
    <h3 class="truncate" v-text="space.name" />
    <h5 class="absolute bottom-4">
      <b class="text-skin-link" v-text="_n(space.proposal_count)" /> proposals ·
      <b class="text-skin-link" v-text="_n(space.vote_count)" /> votes
    </h5>
    <h5 class="line-clamp-2" v-text="space.about" />
  </router-link>
</template>
