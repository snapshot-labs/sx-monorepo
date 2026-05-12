<script lang="ts" setup>
import { RouteLocationRaw } from 'vue-router';
import { OrganizationConfig } from '@/helpers/organizations';
import { _n } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { RelatedSpace, Space } from '@/types';

const props = defineProps<{
  space: Space | RelatedSpace;
  to?: RouteLocationRaw;
  org?: OrganizationConfig | null;
}>();
const compositeSpaceId = `${props.space.network}:${props.space.id}`;
const linkTo = computed<RouteLocationRaw>(
  () =>
    props.to ?? { name: 'space-overview', params: { space: compositeSpaceId } }
);
const displayName = computed(() => props.org?.name ?? props.space.name);
const orgSpaceCount = computed(() => props.org?.spaceIds.length ?? 0);
const avatarSpace = computed(() => {
  if (!props.org) return props.space;
  const primary = props.org.spaceIds[0];
  return {
    id: primary.id,
    network: primary.network,
    avatar: '',
    active_proposals: 0
  };
});
</script>

<template>
  <AppLink
    :to="linkTo"
    class="text-skin-text mx-4 group overflow-hidden flex border-b items-center py-[18px] space-x-3"
  >
    <div class="grow flex items-center min-w-0">
      <UiBadgeNetwork
        :id="avatarSpace.network"
        class="mr-2.5 shrink-0"
        :size="!org && !offchainNetworks.includes(avatarSpace.network) ? 16 : 0"
      >
        <SpaceAvatar :space="avatarSpace" :size="32" class="rounded-md" />
      </UiBadgeNetwork>
      <h3 class="truncate" v-text="displayName" />
      <UiBadgeSpace
        class="ml-1"
        :verified="space.verified"
        :turbo="space.turbo"
        :flagged="
          ('additionalRawData' in space && space.additionalRawData?.flagged) ||
          false
        "
      />
      <span v-if="org" class="ml-2 shrink-0">
        {{ _n(orgSpaceCount) }}
        <span class="text-skin-text">
          {{ orgSpaceCount === 1 ? 'space' : 'spaces' }}
        </span>
      </span>
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
