<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';

const { setFavicon } = useFavicon();
const { space, isPending } = useCurrentSpace();
const { loadVotes } = useAccount();
const { isWhiteLabel } = useWhiteLabel();
const { web3 } = useWeb3();

watch(
  [space, () => web3.value.account],
  ([space, account]) => {
    if (!space || !account) return;
    loadVotes(space.network, [space.id]);
  },
  { immediate: true }
);

watchEffect(() => {
  if (!space.value) {
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
  <UiLoading v-if="isPending" class="block p-4" />
  <router-view v-else-if="space" :space="space" />
</template>
