<script setup lang="ts">
import { getCacheHash, getUrl } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { useSpaceQuery } from '@/queries/spaces';
import { NetworkID } from '@/types';

const SPACE_LOGO_WIDTH = 190;
const SPACE_LOGO_HEIGHT = 38;

defineOptions({ inheritAttrs: false });

const route = useRoute();
const { isWhiteLabel, skinSettings } = useWhiteLabel();
const { logo } = useSkin();
const { param } = useRouteParser('space');
const { resolved, address: spaceAddress, networkId } = useResolve(param);
const { data: spaceData } = useSpaceQuery({
  networkId: networkId,
  spaceId: spaceAddress
});

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

  return spaceData.value;
});

const previewLogoUrl = computed(() => {
  if (
    !isWhiteLabel.value ||
    !logo.value ||
    logo.value === skinSettings.value?.logo
  )
    return;
  return getUrl(logo.value);
});

const onchainLogoUrl = computed(() => {
  if (
    !space.value ||
    offchainNetworks.includes(space.value.network) ||
    !skinSettings.value?.logo
  )
    return;
  return getUrl(skinSettings.value?.logo);
});

const directUrlLogo = computed(() => {
  return previewLogoUrl.value || onchainLogoUrl.value;
});

const hasWhiteLabelLogo = computed(
  () => isWhiteLabel.value && skinSettings.value?.logo
);

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
    <img
      v-if="directUrlLogo"
      :src="directUrlLogo"
      :style="`max-width:${SPACE_LOGO_WIDTH}px; max-height:${SPACE_LOGO_HEIGHT}px;`"
      :alt="space.name"
    />
    <UiStamp
      v-else-if="hasWhiteLabelLogo"
      :id="space.id"
      :cropped="false"
      type="space-logo"
      :width="SPACE_LOGO_WIDTH"
      :height="SPACE_LOGO_HEIGHT"
      class="rounded-none border-none"
      :style="`max-width:${SPACE_LOGO_WIDTH}px; max-height:${SPACE_LOGO_HEIGHT}px;`"
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
