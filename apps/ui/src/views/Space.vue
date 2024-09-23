<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';

const { setFavicon } = useFavicon();
const { param } = useRouteParser('space');
const { resolved, address, networkId } = useResolve(param);
const spacesStore = useSpacesStore();
const { loadVotes } = useAccount();

const space = computed(() => {
  if (!resolved.value) return null;

  return spacesStore.spacesMap.get(`${networkId.value}:${address.value}`);
});

watch(
  [resolved, networkId, address],
  async ([resolved, networkId, address]) => {
    if (!resolved || !networkId || !address) return;

    spacesStore.fetchSpace(address, networkId);
  },
  {
    immediate: true
  }
);

watchEffect(() => {
  if (!resolved.value || !networkId.value || !address.value) return;

  loadVotes(networkId.value, [address.value]);
});

watchEffect(() => {
  if (!space.value) return setFavicon(null);

  const faviconUrl = getStampUrl(
    offchainNetworks.includes(space.value.network) ? 'space' : 'space-sx',
    space.value.id,
    16,
    getCacheHash(space.value.avatar)
  );
  setFavicon(faviconUrl);
});
</script>

<template>
  <UiContainerPage :loading="!space">
    <router-view :space="space" />
  </UiContainerPage>
</template>
