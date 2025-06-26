<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { useSpaceQuery } from '@/queries/spaces';
import { useSpaceQuery as useTownhallSpaceQuery } from '@/queries/townhall';

const { setFavicon } = useFavicon();
const route = useRoute();
const { param } = useRouteParser('space');
const { spaceType, townhallSpaceId } = useTownhallSpace(param);
const { resolved, address, networkId } = useResolve(param);
const { loadVotes } = useAccount();
const { isWhiteLabel } = useWhiteLabel();
const { web3 } = useWeb3();

const { data: space, isPending } = useSpaceQuery({
  networkId,
  spaceId: address
});

const { data: townhallSpace, isPending: isTownhallSpacePending } =
  useTownhallSpaceQuery({
    spaceId: townhallSpaceId,
    spaceType
  });

const isTownhallRoute = computed(() => {
  if (typeof route.name === 'string') {
    return route.name.includes('townhall');
  }

  return false;
});

const isSpaceLoaded = computed(() =>
  space.value && isTownhallRoute.value ? townhallSpace.value : true
);

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
  <UiLoading
    v-if="
      isPending || (spaceType === 'discussionsSpace' && isTownhallSpacePending)
    "
    class="block p-4"
  />

  <div v-else-if="!isSpaceLoaded">
    <div class="px-4 py-3 flex items-center text-skin-link gap-2">
      <IH-exclamation-circle />
      <span>Failed to load space.</span>
    </div>
  </div>
  <router-view v-else :space="space" :townhall-space="townhallSpace" />
</template>
