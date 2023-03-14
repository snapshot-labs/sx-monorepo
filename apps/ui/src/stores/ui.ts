import { defineStore } from 'pinia';
import { getNetwork } from '@/networks';
import { lsSet, lsGet } from '@/helpers/utils';
import { NotificationType, NetworkID } from '@/types';

type Notification = {
  id: string;
  type: NotificationType;
  message: string;
};

type PendingTransaction = {
  networkId: NetworkID;
  txId: string;
};

const PENDING_TRANSACTIONS_STORAGE_KEY = 'pendingTransactions';

function updateStorage(pendingTransactions: PendingTransaction[]) {
  lsSet(PENDING_TRANSACTIONS_STORAGE_KEY, pendingTransactions);
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: false,
    notifications: [] as Notification[],
    pendingTransactions: [] as PendingTransaction[]
  }),
  actions: {
    async toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },
    addNotification(type: NotificationType, message: string, timeout = 5000) {
      const id = crypto.randomUUID();

      this.notifications.push({
        id,
        type,
        message
      });

      setTimeout(() => this.dismissNotification(id), timeout);
    },
    dismissNotification(id: string) {
      this.notifications = this.notifications.filter(notification => notification.id !== id);
    },
    async addPendingTransaction(txId: string, networkId: NetworkID) {
      this.pendingTransactions.push({
        networkId,
        txId
      });
      updateStorage(this.pendingTransactions);

      try {
        await getNetwork(networkId).helpers.waitForTransaction(txId);
      } finally {
        this.pendingTransactions = this.pendingTransactions.filter(el => el.txId !== txId);
        updateStorage(this.pendingTransactions);
      }
    },
    async restorePendingTransactions() {
      this.pendingTransactions = lsGet(PENDING_TRANSACTIONS_STORAGE_KEY, []);

      this.pendingTransactions.forEach(async ({ networkId, txId }) => {
        try {
          await getNetwork(networkId).helpers.waitForTransaction(txId);
        } finally {
          this.pendingTransactions = this.pendingTransactions.filter(el => el.txId !== txId);
          updateStorage(this.pendingTransactions);
        }
      });
    }
  }
});
