<script setup lang="ts">
import type { NetworkID } from '@/types';

const route = useRoute();
const proposalsStore = useProposalsStore();
const { param } = useRouteParser('space');
const { resolved, address: spaceAddress, networkId } = useResolve(param);

const show = computed(() => route.matched[0]?.name === 'proposal');

const space = computed(() => {
  if (!show || !resolved.value || !spaceAddress.value || !networkId.value) {
    return null;
  }

  return proposalsStore.getProposal(spaceAddress.value, route.params.id as string, networkId.value)
    ?.space;
});
</script>

<template>
  <template v-if="show">
    <router-link
      v-if="space"
      :to="{
        name: 'space-overview',
        params: { id: `${networkId}:${spaceAddress}` }
      }"
      class="flex space-x-2.5 truncate text-[24px]"
    >
      <SpaceAvatar
        :space="{ ...space, network: networkId as NetworkID }"
        :size="36"
        class="!rounded-[4px] shrink-0"
      />
      <span class="truncate" v-text="space.name" />
    </router-link>
  </template>
  <slot v-else />
</template>
