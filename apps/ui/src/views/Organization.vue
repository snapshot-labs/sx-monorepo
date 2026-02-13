<script setup lang="ts">
import {
  getOrganizationByDomain,
  getOrganizationById
} from '@/helpers/organizations';
import { getCacheHash, getStampUrl } from '@/helpers/utils';

const route = useRoute();
const { setFavicon } = useFavicon();
const { loadVotes } = useAccount();
const { web3 } = useWeb3();
const { organization, resolved, loadOrgSpaces } = useOrganization();

const orgConfig =
  getOrganizationByDomain(window.location.hostname) ??
  getOrganizationById(route.params.orgId as string);

onMounted(() => {
  if (orgConfig) loadOrgSpaces(orgConfig);
});

const activeSpace = computed(() => {
  if (!organization.value) return null;
  const spaceParam = route.params.space as string | undefined;

  if (spaceParam) {
    const match = organization.value.spaces.find(
      s => spaceParam === `${s.network}:${s.id}`
    );
    if (match) return match;
  }

  return organization.value.spaces[0] ?? null;
});

watch(
  [() => organization.value?.spaces, () => web3.value.account],
  ([spaces, account]) => {
    if (!spaces || !account) return;
    for (const space of spaces) {
      loadVotes(space.network, [space.id]);
    }
  },
  { immediate: true }
);

watchEffect(() => {
  const firstSpace = organization.value?.spaces[0];
  if (!firstSpace) {
    setFavicon(null);
    return;
  }

  setFavicon(
    getStampUrl(
      'space',
      `${firstSpace.network}:${firstSpace.id}`,
      16,
      getCacheHash(firstSpace.avatar)
    )
  );
});

onUnmounted(() => {
  setFavicon(null);
});
</script>

<template>
  <UiLoading v-if="!resolved" class="block p-4" />
  <router-view v-else :space="activeSpace" />
</template>
