<script lang="ts" setup>
import { _n } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { RelatedSpace, Space } from '@/types';

const props = withDefaults(
  defineProps<{
    space: Space | RelatedSpace;
    showAbout?: boolean;
  }>(),
  { showAbout: true }
);
const compositeSpaceId = `${props.space.network}:${props.space.id}`;

const spaceRoute = computed(() => {
  // For local spaces, use the spaceContractAddress
  if (props.space.spaceContractAddress) {
    return {
      name: 'space-overview',
      params: { space: props.space.spaceContractAddress }
    };
  }
  // For API spaces, use the composite ID
  const compositeSpaceId = `${props.space.network}:${props.space.id}`;
  return {
    name: 'space-overview',
    params: { space: compositeSpaceId }
  };
});
</script>

<template>
  <AppLink
    :to="spaceRoute"
    class="text-skin-text border rounded-lg block relative group overflow-hidden h-[186px]"
    :class="{ 'h-[280px]': showAbout }"
  >
    <div class="h-[68px] w-full absolute overflow-hidden">
      <SpaceCover :space="props.space" size="sm" />
    </div>
    <div class="relative inline-block mx-4 mt-[34px]">
      <UiBadgeNetwork
        :id="space.network"
        :size="!offchainNetworks.includes(space.network) ? 16 : 0"
        class="mb-2"
      >
        <SpaceAvatar
          show-active-proposals
          :space="space"
          :size="50"
          class="border-skin-bg rounded-md border-[3px]"
        />
      </UiBadgeNetwork>
    </div>
    <ButtonFollow
      :space="space"
      class="!absolute top-2.5 right-2.5 hidden group-hover:block"
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

      <h5
        v-if="showAbout"
        class="mt-1 line-clamp-3 leading-6"
        v-text="space.about"
      />
    </div>
    <h5 class="absolute bottom-4 px-4 text-[17px]">
      <b class="text-skin-link" v-text="_n(space.proposal_count, 'compact')" />
      proposals ·
      <b class="text-skin-link" v-text="_n(space.vote_count, 'compact')" />
      votes
    </h5>
  </AppLink>
</template>
