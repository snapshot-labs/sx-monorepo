<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { useSpaceQuery } from '@/queries/spaces';

const { setFavicon } = useFavicon();
const { param } = useRouteParser('space');
const { resolved, address, networkId } = useResolve(param);
const { loadVotes } = useAccount();
const { isWhiteLabel } = useWhiteLabel();
const { web3 } = useWeb3();

const { data: space, isPending } = useSpaceQuery({
  networkId,
  spaceId: address
});

watch(
  [resolved, networkId, address, () => web3.value.account],
  async ([resolved, networkId, address, account]) => {
    if (!resolved || !networkId || !address) return;

    if (account) {
      loadVotes(networkId, [address]);
    }
  },
  {
    immediate: true
  }
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
  <router-view v-else :space="space" />
</template>
