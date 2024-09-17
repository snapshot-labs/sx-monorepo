<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';

const { setFavicon } = useFavicon();
const { param } = useRouteParser('space');
const { resolved, address, networkId } = useResolve(param);
const route = useRoute();
const spacesStore = useSpacesStore();
const { loadVotes } = useAccount();

const space = computed(() => {
  if (!resolved.value) return null;

  return spacesStore.spacesMap.get(`${networkId.value}:${address.value}`);
});

const hasRightPlaceholderSidebar = computed(() => {
  return String(route.matched[1]?.name) !== 'space-editor';
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
  <div>
    <div
      class="mx-0"
      :class="{
        'xl:mr-[240px]': hasRightPlaceholderSidebar
      }"
    >
      <UiLoading v-if="!space" class="block p-4" />
      <router-view v-else :space="space" />
    </div>
    <div
      v-if="hasRightPlaceholderSidebar"
      class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0"
    />
  </div>
</template>
