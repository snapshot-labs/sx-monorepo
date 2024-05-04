import { defineStore } from 'pinia';
import { getNetwork } from '@/networks';
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
  const lastUnreadTs = useStorage(`${pkg.name}.notifications.last-unread`, 0);

  const bookmarksStore = useBookmarksStore();
  const metaStore = useMetaStore();

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

    const followedSpaceIdsByNetwork: Record<NetworkID, string[]> = bookmarksStore.followedSpacesIds
      .map(id => id.split(':'))
      .reduce((acc, [networkId, spaceId]) => {
        acc[networkId] ||= [];
        acc[networkId].push(spaceId);
        return acc;
      }, {});

    (Object.keys(followedSpaceIdsByNetwork) as NetworkID[]).forEach(async networkId => {
      await metaStore.fetchBlock(networkId);
    });

    const promises = (Object.entries(followedSpaceIdsByNetwork) as [NetworkID, string[]][])
      .map(([networkId, spaceIds]) => {
        const network = getNetwork(networkId);
        const current = metaStore.getCurrent(networkId) || 0;

        return [
          loadProposals(network, current, 'active', pivotTs, spaceIds),
          loadProposals(network, current, 'closed', pivotTs, spaceIds)
        ];
      })
      .flat();

    const proposals = (await Promise.all(promises)).flat();

    proposals.forEach(proposal => {
      const timestamp = proposal.min_end < now ? proposal.min_end : proposal.start;

      if (notifications.value.some(n => n.id === proposal.id)) return;

      notifications.value.push({
        id: proposal.id,
        proposal,
        type: proposal.min_end < now ? 'ended' : 'started',
        timestamp,
        unread: timestamp > lastUnreadTs.value
      });
    });

    notifications.value.sort((a, b) => b.timestamp - a.timestamp);

    loading.value = false;
  }

  function markAllAsRead() {
    notifications.value.forEach(notification => {
      notification.unread = false;
    });
    lastUnreadTs.value = notifications.value[0]?.timestamp || 0;
  }

  const unreadNotificationsCount = computed(
    () => notifications.value.map(n => n.unread).filter(Boolean).length
  );

  watch(
    () => bookmarksStore.followedSpacesIds,
    () => {
      notifications.value = [];
      loadNotifications();
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
