<script lang="ts" setup>
import { OrganizationConfig, resolveSpaceItem } from '@/helpers/organizations';
import { _n } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { RelatedSpace, Space } from '@/types';

const props = defineProps<{
  space: Space | RelatedSpace;
  org?: OrganizationConfig | null;
}>();

const item = computed(() => resolveSpaceItem(props.space, props.org ?? null));
</script>

<template>
  <AppLink
    :to="item.link"
    class="text-skin-text mx-4 group overflow-hidden flex border-b items-center py-[18px] space-x-3"
  >
    <div class="grow flex items-center min-w-0">
      <UiBadgeNetwork
        :id="item.avatarSpace.network"
        class="mr-2.5 shrink-0"
        :size="
          !org && !offchainNetworks.includes(item.avatarSpace.network) ? 16 : 0
        "
      >
        <SpaceAvatar :space="item.avatarSpace" :size="32" class="rounded-md" />
      </UiBadgeNetwork>
      <h3 class="truncate" v-text="item.title" />
      <UiBadgeSpace
        class="ml-1"
        :verified="space.verified"
        :turbo="space.turbo"
        :flagged="
          ('additionalRawData' in space && space.additionalRawData?.flagged) ||
          false
        "
      />
      <span v-if="org" class="ml-2 shrink-0 text-skin-text">
        {{ org.spaceIds.length }}
        {{ org.spaceIds.length === 1 ? 'space' : 'spaces' }}
      </span>
    </div>
    <ButtonFollow :space="space" class="hidden group-hover:block -my-2" />
    <div class="text-[21px] font-bold flex text-center">
      <span
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
