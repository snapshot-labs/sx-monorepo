<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { useSpaceQuery } from '@/queries/spaces';

const route = useRoute();
const { setFavicon } = useFavicon();
const { loadVotes } = useAccount();
const { isWhiteLabel } = useWhiteLabel();
const { web3 } = useWeb3();
const { orgDefinition } = useRouteContext();

const { data: primarySpace, isPending: isPrimaryPending } = useSpaceQuery({
  networkId: computed(() => orgDefinition.value?.primarySpace.network ?? null),
  spaceId: computed(() => orgDefinition.value?.primarySpace.id ?? null)
});

const { data: secondarySpace, isPending: isSecondaryPending } = useSpaceQuery({
  networkId: computed(
    () => orgDefinition.value?.secondarySpace.network ?? null
  ),
  spaceId: computed(() => orgDefinition.value?.secondarySpace.id ?? null)
});

const isPending = computed(
  () => isPrimaryPending.value || isSecondaryPending.value
);

const isSecondaryRoute = computed(() => {
  if (route.name === 'org-polls') return true;
  const spaceParam = route.params.space as string | undefined;
  if (!spaceParam || !orgDefinition.value) return false;
  const { network, id } = orgDefinition.value.secondarySpace;
  return spaceParam === `${network}:${id}`;
});

const activeSpace = computed(() =>
  isSecondaryRoute.value ? secondarySpace.value : primarySpace.value
);

watch(
  [() => orgDefinition.value?.primarySpace, () => web3.value.account],
  ([primary, account]) => {
    if (!primary || !account) return;
    loadVotes(primary.network, [primary.id]);
  },
  { immediate: true }
);

watchEffect(() => {
  if (!primarySpace.value) {
    setFavicon(null);
    return;
  }

  setFavicon(
    getStampUrl(
      'space',
      `${primarySpace.value.network}:${primarySpace.value.id}`,
      16,
      getCacheHash(primarySpace.value.avatar)
    )
  );
});

onUnmounted(() => {
  if (!isWhiteLabel.value) setFavicon(null);
});
</script>

<template>
  <UiLoading v-if="isPending" class="block p-4" />
  <router-view v-else :space="activeSpace" />
</template>
