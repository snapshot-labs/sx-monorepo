<script setup lang="ts">
import { useUiStore } from '@/stores/ui';
import { useSpacesStore } from '@/stores/spaces';
import { getCacheHash, getStampUrl } from '@/helpers/utils';

const { setFavicon } = useFavicon();
const { param } = useRouteParser('id');
const { resolved, address, networkId } = useResolve(param);
const uiStore = useUiStore();
const spacesStore = useSpacesStore();

const space = computed(() => {
  if (!resolved.value) return null;

  return spacesStore.spacesMap.get(`${networkId.value}:${address.value}`);
});

watch(
  [resolved, networkId, address],
  ([resolved, networkId, address]) => {
    if (!resolved || !networkId || !address) return;

    spacesStore.fetchSpace(address, networkId);
  },
  {
    immediate: true
  }
);

watchEffect(() => {
  if (!space.value) return setFavicon(null);

  const faviconUrl = getStampUrl('space-sx', space.value.id, 16, getCacheHash(space.value.avatar));
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
