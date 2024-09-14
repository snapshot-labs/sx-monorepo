<script setup lang="ts">
import { NetworkID } from '@/types';

defineOptions({ inheritAttrs: false });

const route = useRoute();
const spacesStore = useSpacesStore();
const proposalsStore = useProposalsStore();

const param = computed(() =>
  String(
    route.matched[0]?.name === 'space' ? route.params.id : route.params.space
  )
);

const { resolved, address: spaceAddress, networkId } = useResolve(param);

const showSpace = computed(() =>
  ['proposal', 'space'].includes(String(route.matched[0]?.name))
);

const space = computed(() => {
  if (
    !showSpace.value ||
    !resolved.value ||
    !spaceAddress.value ||
    !networkId.value
  ) {
    return null;
  }
  return (
    spacesStore.spacesMap.get(`${networkId.value}:${spaceAddress.value}`) ||
    proposalsStore.getProposal(
      spaceAddress.value,
      route.params.id as string,
      networkId.value
    )?.space
  );
});
</script>

<template>
  <WhiteLabelAwareLink
    v-if="space"
    :to="{
      name: 'space-overview',
      params: { id: `${networkId}:${spaceAddress}` }
    }"
    class="flex item-center space-x-2.5 truncate text-[24px]"
    v-bind="$attrs"
  >
    <SpaceAvatar
      :space="{ ...space, network: networkId as NetworkID }"
      :size="36"
      class="!rounded-[4px] shrink-0"
    />
    <span class="truncate" v-text="space.name" />
  </WhiteLabelAwareLink>
</template>
