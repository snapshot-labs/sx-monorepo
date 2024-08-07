<script lang="ts" setup>
import { _n } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();
const compositeSpaceId = `${props.space.network}:${props.space.id}`;
</script>

<template>
  <router-link
    :to="{ name: 'space-overview', params: { id: compositeSpaceId } }"
    class="text-skin-text border rounded-lg block h-[280px] relative group overflow-hidden"
  >
    <div class="h-[68px] w-full absolute">
      <SpaceCover :space="props.space" size="sm" />
    </div>
    <div class="relative inline-block mx-4 mt-[34px]">
      <UiBadgeNetwork
        :id="space.network"
        :size="!offchainNetworks.includes(space.network) ? 16 : 0"
        class="mb-2"
      >
        <SpaceAvatar
          :space="space"
          :size="50"
          class="border-skin-bg rounded-md border-[3px]"
        />
      </UiBadgeNetwork>
    </div>
    <ButtonFollow
      :space="space"
      class="absolute top-2.5 right-2.5 hidden group-hover:block"
    />
    <div class="px-4">
      <div class="flex items-center">
        <h3 class="truncate" v-text="space.name" />
        <UiBadgeVerified
          class="ml-1"
          :verified="space.verified"
          :turbo="space.turbo"
        />
      </div>

      <h5 class="mt-1 line-clamp-2 leading-6" v-text="space.about" />
    </div>
    <h5 class="absolute bottom-4 px-4 text-[17px]">
      <b class="text-skin-link" v-text="_n(space.proposal_count, 'compact')" />
      proposals ·
      <b class="text-skin-link" v-text="_n(space.vote_count, 'compact')" />
      votes
    </h5>
  </router-link>
</template>
