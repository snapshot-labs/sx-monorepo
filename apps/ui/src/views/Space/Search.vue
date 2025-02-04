<script setup lang="ts">
import { useProposalsQuery } from '@/queries/proposals';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const route = useRoute();

const query = computed(() => (route.query.q as string) || '');

const { data, fetchNextPage, hasNextPage, isPending, isFetchingNextPage } =
  useProposalsQuery(props.space.network, props.space.id, {}, query);

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

watchEffect(() => setTitle(`Search - ${props.space.name}`));
</script>

<template>
  <ProposalsList
    title="Proposals"
    limit="off"
    :loading="isPending"
    :loading-more="isFetchingNextPage"
    :proposals="data?.pages.flat() ?? []"
    @end-reached="handleEndReached"
  />
</template>
