<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { NetworkID, Space } from '@/types';

defineOptions({ inheritAttrs: false });

const route = useRoute();
const queryClient = useQueryClient();
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

  return (
    queryClient.getQueryData<Space>([
      'spaces',
      'detail',
      `${networkId.value}:${spaceAddress.value}`
    ]) ?? null
  );
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
    <div class="shrink-0">
      <SpaceAvatar
        :space="{ ...space, network: networkId as NetworkID }"
        :size="36"
        class="!rounded-[4px]"
      />
    </div>
    <span class="truncate" v-text="space.name" />
  </AppLink>
</template>
