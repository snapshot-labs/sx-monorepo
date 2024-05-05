import { defineStore } from 'pinia';
import { getNetwork, offchainNetworks } from '@/networks';
import { Network, ProposalsFilter } from '@/networks/types';
import { NetworkID, Proposal } from '@/types';
import pkg from '../../package.json';

type Notification = {
  id: string;
  proposal: Proposal;
  type: 'started' | 'ended';
  timestamp: number;
  unread: boolean;
};

const NOTIFICATION_TIME_WINDOW = 60 * 60 * 24 * 14; // 2 weeks
const REFRESH_INTERVAL = 60 * 15; // 15 minutes
let refreshNotificationInterval: NodeJS.Timeout;

export const useNotificationsStore = defineStore('notifications', () => {
  const loading = ref(true);
  const notifications = ref<Notification[]>([]);
  const lastUnreadTs = useStorage(
    `${pkg.name}.notifications.last-unread`,
    {} as Record<string, number>
  );

  const bookmarksStore = useBookmarksStore();
  const metaStore = useMetaStore();
  const { web3 } = useWeb3();

  async function loadProposals(
    network: Network,
    current: number,
    state: NonNullable<ProposalsFilter['state']>,
    pivotTs: number,
    spaceIds: string[]
  ) {
    return await network.api.loadProposals(spaceIds, { limit: 100 }, current, {
      state,
      start_gte: pivotTs
    });
  }

  async function loadNotifications() {
    const now = Math.floor(Date.now() / 1e3);
    const pivotTs = now - NOTIFICATION_TIME_WINDOW;

    if (!bookmarksStore.followedSpacesIds.length) return;

    const followedSpaceIdsByNetwork: Record<NetworkID, string[]> = bookmarksStore.followedSpacesIds
      .map(id => id.split(':') as [NetworkID, string])
      .reduce(
        (acc, [networkId, spaceId]) => {
          acc[networkId] ||= [];
          acc[networkId].push(
            offchainNetworks.includes(networkId) ? spaceId : `${networkId}:${spaceId}`
          );
          return acc;
        },
        {} as Record<NetworkID, string[]>
      );

    (Object.keys(followedSpaceIdsByNetwork) as NetworkID[]).forEach(async networkId => {
      await metaStore.fetchBlock(networkId);
    });

    const promises = (Object.entries(followedSpaceIdsByNetwork) as [NetworkID, string[]][])
      .map(([networkId, spaceIds]) => {
        const network = getNetwork(networkId);
        const current = metaStore.getCurrent(networkId) ?? 0;

        return [
          loadProposals(network, current, 'active', pivotTs, spaceIds),
          loadProposals(network, current, 'closed', pivotTs, spaceIds)
        ];
      })
      .flat();

    const proposals = (await Promise.all(promises)).flat();

    proposals.forEach(proposal => {
      const timestamp = proposal.min_end < now ? proposal.min_end : proposal.start;
      const lastUnread = lastUnreadTs.value[web3.value.account] ?? 0;

      if (notifications.value.some(n => n.id === proposal.id)) return;

      notifications.value.push({
        id: proposal.id,
        proposal,
        type: proposal.min_end < now ? 'ended' : 'started',
        timestamp,
        unread: timestamp > lastUnread
      });
    });

    notifications.value.sort((a, b) => b.timestamp - a.timestamp);
  }

  function markAllAsRead() {
    notifications.value.forEach(notification => {
      notification.unread = false;
    });
    lastUnreadTs.value[web3.value.account] = notifications.value[0]?.timestamp ?? 0;
  }

  const unreadNotificationsCount = computed(
    () => notifications.value.map(n => n.unread).filter(Boolean).length
  );

  watch(
    [() => bookmarksStore.followedSpacesLoaded, () => bookmarksStore.followedSpacesIds],
    async loaded => {
      if (!loaded) return;

      loading.value = true;
      notifications.value = [];
      await loadNotifications();

      loading.value = false;
    },
    { immediate: true }
  );

  onMounted(() => {
    refreshNotificationInterval = setInterval(loadNotifications, REFRESH_INTERVAL * 1e3);
  });

  onBeforeUnmount(() => clearInterval(refreshNotificationInterval));

  return {
    unreadNotificationsCount,
    loading,
    notifications,
    markAllAsRead
  };
});
