<script setup lang="ts">
import { NetworkID } from '@/types';

defineOptions({ inheritAttrs: false });

const route = useRoute();
const spacesStore = useSpacesStore();
const { isWhiteLabel } = useWhiteLabel();
const { param } = useRouteParser('space');
const { resolved, address: spaceAddress, networkId } = useResolve(param);

const showSpace = computed(
  () =>
    ['proposal', 'space'].includes(String(route.matched[0]?.name)) ||
    isWhiteLabel.value
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

  return spacesStore.spacesMap.get(`${networkId.value}:${spaceAddress.value}`);
});
</script>

<template>
  <AppLink
    v-if="space"
    :to="{
      name: 'space-overview'
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
  </AppLink>
</template>
