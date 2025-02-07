<script setup lang="ts">
import { getCacheHash } from '@/helpers/utils';
import { NetworkID } from '@/types';

defineOptions({ inheritAttrs: false });

const route = useRoute();
const spacesStore = useSpacesStore();
const { isWhiteLabel } = useWhiteLabel();
const { logo } = useSkin();
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

const logo = computed(() => {
  if (!isWhiteLabel.value) return;

  return space.value?.additionalRawData?.skinSettings?.logo;
});

const cb = computed(() => (logo.value ? getCacheHash(logo.value) : undefined));
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
    <UiStamp
      v-if="logo"
      :id="space.id"
      type="space-logo"
      :width="190"
      :height="38"
      class="rounded-none border-none"
      :cb="cb"
    />
    <template v-else>
      <div class="shrink-0">
        <SpaceAvatar
          :space="{ ...space, network: networkId as NetworkID }"
          :size="36"
          class="!rounded-[4px]"
        />
      </div>
      <span class="truncate" v-text="space.name" />
    </template>
  </AppLink>
</template>
