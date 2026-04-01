<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getNetwork } from '@/networks';
import { NetworkID, User } from '@/types';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ user: User }>();

const metaStore = useMetaStore();
const { setTitle } = useTitle();
const { organization } = useOrganization();

const spaces = computed(() => organization.value?.spaces ?? []);

const spaceIdsByNetwork = computed<Map<NetworkID, string[]>>(() => {
  const grouped = Map.groupBy(spaces.value, s => s.network);

  return new Map(Array.from(grouped, ([k, v]) => [k, v.map(s => s.id)]));
});

const { data: proposals, isPending } = useQuery({
  queryKey: [
    'org',
    () => organization.value?.id,
    'user',
    () => props.user.id,
    'proposals'
  ],
  queryFn: async () => {
    const results = await Promise.all(
      Array.from(spaceIdsByNetwork.value, ([networkId, spaceIds]) =>
        getNetwork(networkId).api.loadProposals(
          spaceIds,
          { limit: 1000 },
          metaStore.getCurrent(networkId) || 0,
          { author: props.user.id }
        )
      )
    );

    return results.flat().sort((a, b) => b.created - a.created);
  }
});

watchEffect(() => setTitle(`${props.user.name || props.user.id} proposals`));
</script>

<template>
  <ProposalsList
    limit="off"
    :loading="isPending"
    :loading-more="false"
    :proposals="proposals ?? []"
    :show-author="false"
    :show-space="false"
  />
</template>
