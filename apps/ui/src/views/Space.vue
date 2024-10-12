<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';

const { setFavicon } = useFavicon();
const { param } = useRouteParser('space');
const { resolved, address, networkId } = useResolve(param);
const spacesStore = useSpacesStore();
const { loadVotes } = useAccount();
const { isWhiteLabel } = useWhiteLabel();

const spaceKey = computed(() => `${networkId.value}:${address.value}`);

const space = computed(() => {
  if (!resolved.value) return null;

  return spacesStore.spacesMap.get(spaceKey.value);
});

watch(
  [resolved, networkId, address],
  async ([resolved, networkId, address]) => {
    if (!resolved || !networkId || !address) return;

    if (!spacesStore.spacesMap.has(spaceKey.value)) {
      spacesStore.fetchSpace(address, networkId);
    }
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
  if (!space.value || isWhiteLabel.value) {
    setFavicon(null);
    return;
  }

  const faviconUrl = getStampUrl(
    'space',
    `${space.value.network}:${space.value.id}`,
    16,
    getCacheHash(space.value.avatar)
  );
  setFavicon(faviconUrl);
});

onUnmounted(() => {
  if (!isWhiteLabel.value) setFavicon(null);
});
</script>

<template>
  <UiLoading v-if="!space" class="block p-4" />
  <router-view v-else :space="space" />
</template>
