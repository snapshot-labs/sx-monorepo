<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';

const { setFavicon } = useFavicon();
const { param } = useRouteParser('id');
const { resolved, address, networkId } = useResolve(param);
const uiStore = useUiStore();
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
  <div>
    <div>
      <div
        class="ml-0 lg:ml-[240px] mr-0 xl:mr-[240px]"
        :class="{ 'translate-x-[240px] lg:translate-x-0': uiStore.sidebarOpen }"
      >
        <UiLoading v-if="!space" class="block p-4" />
        <router-view v-else :space="space" />
      </div>
      <div class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0" />
    </div>
  </div>
</template>
