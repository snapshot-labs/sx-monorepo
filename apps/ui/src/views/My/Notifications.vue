<script setup lang="ts">
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { ProposalsFilter } from '@/networks/types';
import { Proposal } from '@/types';
import { _rt } from '@/helpers/utils';

type Notification = {
  id: string;
  proposal: Proposal;
  type: 'started' | 'ended';
  timestamp: number;
};

const OFFSET = 60 * 60 * 24 * 14; // 2 weeks

const offchainNetworkId = offchainNetworks.filter(network => enabledNetworks.includes(network))[0];
const network = getNetwork(offchainNetworkId);

const loading = ref(true);
const notifications = ref<Notification[]>([]);

const bookmarksStore = useBookmarksStore();
const metaStore = useMetaStore();
const { setTitle } = useTitle();

async function loadProposals(state: NonNullable<ProposalsFilter['state']>, pivotTs: number) {
  return await network.api.loadProposals(
    bookmarksStore.followedSpacesIds.map(id => id.split(':')[1]),
    { limit: 100 },
    metaStore.getCurrent(offchainNetworkId) || 0,
    { state, start_gte: pivotTs }
  );
}

async function loadNotifications() {
  await metaStore.fetchBlock(offchainNetworkId);
  const now = Math.floor(Date.now() / 1e3);
  const pivotTs = now - OFFSET;

  const proposals = (
    await Promise.all([loadProposals('active', pivotTs), loadProposals('closed', pivotTs)])
  ).flat();

  proposals.forEach(proposal => {
    notifications.value.push({
      id: proposal.id,
      proposal,
      type: proposal.min_end < now ? 'ended' : 'started',
      timestamp: proposal.min_end < now ? proposal.min_end : proposal.start
    });
  });

  notifications.value.sort((a, b) => b.timestamp - a.timestamp);
}

onMounted(async () => {
  await loadNotifications();
  loading.value = false;
});

watchEffect(async () => {
  setTitle(`Notifications${notifications.value.length ? ` (${notifications.value.length})` : ''}`);
});
</script>

<template>
  <div>
    <UiLabel :label="'Notifications'" sticky />
    <UiLoading v-if="loading" class="block px-4 py-3" />
    <div v-else-if="notifications.length">
      <div v-for="(notification, i) in notifications" :key="i">
        <div class="border-b mx-4 py-[14px] flex space-x-3">
          <div>
            <router-link
              :to="{
                name: 'space-overview',
                params: {
                  id: `${notification.proposal.network}:${notification.proposal.space.id}`
                }
              }"
            >
              {{ notification.proposal.space.name }}
            </router-link>
            proposal has {{ notification.type }}
            {{ _rt(notification.timestamp) }}
            <router-link
              :to="{
                name: 'proposal-overview',
                params: {
                  id: notification.proposal.proposal_id,
                  space: `${notification.proposal.network}:${notification.proposal.space.id}`
                }
              }"
            >
              <h3
                class="font-normal text-[21px]"
                v-text="notification.proposal.title || `#${notification.proposal.proposal_id}`"
              />
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
