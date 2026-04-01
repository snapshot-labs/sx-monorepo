<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { Organization } from '@/helpers/organizations';
import { getNetwork } from '@/networks';
import { NetworkID, User } from '@/types';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ organization: Organization; user: User }>();

const metaStore = useMetaStore();
const { setTitle } = useTitle();

const spaceIdsByNetwork = computed<Map<NetworkID, string[]>>(() => {
  return props.organization.spaces.reduce((map, s) => {
    if (!map.has(s.network)) map.set(s.network, []);
    map.get(s.network)!.push(s.id);

    return map;
  }, new Map<NetworkID, string[]>());
});

const { data: proposals, isPending } = useQuery({
  queryKey: [
    'org',
    () => props.organization.id,
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
