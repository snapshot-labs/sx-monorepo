<script setup lang="ts">
import {
  useCreateSpaceMutation,
  useSpaceQuery as useTownhallSpaceQuery
} from '@/queries/townhall';

const route = useRoute();
const { loadVotes } = useAccount();
const { web3 } = useWeb3();
const { space, spaceType, townhallSpaceId, isPending } = useCurrentSpace();

const { data: townhallSpace, isPending: isTownhallSpacePending } =
  useTownhallSpaceQuery({
    spaceId: townhallSpaceId,
    spaceType
  });

const { mutate: createTownhallSpace, isPending: isCreateTownhallSpacePending } =
  useCreateSpaceMutation();

const isTownhallRoute = computed(() => {
  if (typeof route.name === 'string') {
    return route.name.includes('townhall');
  }

  return false;
});

watch(
  [space, () => web3.value.account],
  ([space, account]) => {
    if (!space || !account) return;
    loadVotes(space.network, [space.id]);
  },
  { immediate: true }
);
</script>

<template>
  <UiLoading
    v-if="
      isPending || (spaceType === 'discussionsSpace' && isTownhallSpacePending)
    "
    class="block p-4"
  />

  <div v-else-if="!space">
    <div class="px-4 py-3 flex items-center text-skin-link gap-2">
      <IH-exclamation-circle />
      <span>Failed to load space.</span>
    </div>
  </div>
  <div
    v-else-if="isTownhallRoute && !townhallSpace"
    class="px-4 py-3 flex flex-col gap-2 text-skin-link"
  >
    <div>This space is not initialized yet.</div>
    <div>
      <UiButton
        :loading="isCreateTownhallSpacePending"
        @click="createTownhallSpace"
      >
        Initialize
      </UiButton>
    </div>
  </div>
  <router-view
    v-else-if="space"
    :space="space"
    :townhall-space="townhallSpace"
  />
</template>
