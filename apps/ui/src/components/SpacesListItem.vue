<script lang="ts" setup>
import { _n } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { RelatedSpace, Space } from '@/types';

const props = defineProps<{ space: Space | RelatedSpace }>();
const compositeSpaceId = `${props.space.network}:${props.space.id}`;
</script>

<template>
  <AppLink
    :to="{ name: 'space-overview', params: { space: compositeSpaceId } }"
    class="text-skin-text px-4 block relative group overflow-hidden"
  >
    <div class="flex border-b items-center py-3.5">
      <div class="mr-2 shrink-0">
        <UiBadgeNetwork
          :id="space.network"
          :size="!offchainNetworks.includes(space.network) ? 16 : 0"
        >
          <SpaceAvatar :space="space" :size="32" class="rounded-md" />
        </UiBadgeNetwork>
      </div>
      <div class="grow flex items-center truncate">
        <h3 class="truncate" v-text="space.name" />
        <UiBadgeVerified
          class="ml-1"
          :verified="space.verified"
          :turbo="space.turbo"
        />
      </div>
      <div class="text-[21px] font-bold flex text-center group-hover:hidden">
        <span
          v-if="space.active_proposals && space.active_proposals > 0"
          class="text-skin-success w-[50px] md:w-[100px]"
          v-text="_n(space.active_proposals, 'compact')"
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
      <ButtonFollow :space="space" class="hidden group-hover:block -my-2" />
    </div>
  </AppLink>
</template>
