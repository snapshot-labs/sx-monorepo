import { defineStore } from 'pinia';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { ProposalsFilter } from '@/networks/types';
import { Proposal } from '@/types';
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
const offchainNetworkId = offchainNetworks.filter(network => enabledNetworks.includes(network))[0];
const network = getNetwork(offchainNetworkId);
let refreshNotificationInterval: NodeJS.Timeout;

export const useNotificationsStore = defineStore('notifications', () => {
  const loading = ref(true);
  const notifications = ref<Notification[]>([]);
  const lastUnreadTs = useStorage(`${pkg.name}.notifications.last-unread`, 0);

  const bookmarksStore = useBookmarksStore();
  const metaStore = useMetaStore();

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
    const pivotTs = now - NOTIFICATION_TIME_WINDOW;

    const proposals = (
      await Promise.all([loadProposals('active', pivotTs), loadProposals('closed', pivotTs)])
    ).flat();

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
  }

  function markAllAsRead() {
    notifications.value.forEach(notification => {
      notification.unread = false;
    });
    lastUnreadTs.value = Math.floor(Date.now() / 1e3);
  }

  const unreadNotificationsCount = computed(
    () => notifications.value.map(n => n.unread).filter(Boolean).length
  );

  watch(bookmarksStore.followedSpacesIds, () => {
    notifications.value = [];
    loadNotifications();
  });

  onMounted(async () => {
    await loadNotifications();
    loading.value = false;

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
