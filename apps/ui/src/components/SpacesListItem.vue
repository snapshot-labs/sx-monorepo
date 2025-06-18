<script lang="ts" setup>
import { _n } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { RelatedSpace, Space } from '@/types';

const props = defineProps<{ space: Space | RelatedSpace }>();
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
    class="text-skin-text mx-4 group overflow-hidden flex border-b items-center py-[18px] space-x-3"
    :to="spaceRoute"
  >
    <div class="grow flex items-center">
      <UiBadgeNetwork
        :id="space.network"
        class="mr-2.5 shrink-0"
        :size="!offchainNetworks.includes(space.network) ? 16 : 0"
      >
        <SpaceAvatar :space="space" :size="32" class="rounded-md" />
      </UiBadgeNetwork>
      <h3 class="truncate" v-text="space.name" />
      <UiBadgeSpace
        class="ml-1"
        :verified="space.verified"
        :turbo="space.turbo"
        :flagged="
          ('additionalRawData' in space && space.additionalRawData?.flagged) ||
          false
        "
      />
    </div>
    <ButtonFollow :space="space" class="hidden group-hover:block -my-2" />
    <div class="text-[21px] font-bold flex text-center">
      <span
        v-if="space.protocol === 'snapshot'"
        class="w-[50px] md:w-[100px]"
        :class="{ 'text-skin-success': (space.active_proposals ?? 0) > 0 }"
        v-text="_n(space.active_proposals ?? 0, 'compact')"
      />
      <span
        class="text-skin-link w-[100px] hidden md:block"
        v-text="_n(space.proposal_count, 'compact')"
      />
      <span
        v-if="space.follower_count !== undefined"
        class="text-skin-link w-[100px] hidden md:block"
        v-text="_n(space.follower_count, 'compact')"
      />
    </div>
  </AppLink>
</template>
