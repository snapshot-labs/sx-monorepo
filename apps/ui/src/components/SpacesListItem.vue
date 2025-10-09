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
      <div class="grow flex items-center truncate mr-2">
        <h3 class="truncate" v-text="space.name" />
        <UiBadgeVerified
          class="ml-1"
          :verified="space.verified"
          :turbo="space.turbo"
        />
      </div>
      <ButtonFollow
        :space="space"
        class="hidden group-hover:block -my-2"
        @click.prevent="e => e.preventDefault()"
      />
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
    </div>
  </AppLink>
</template>
