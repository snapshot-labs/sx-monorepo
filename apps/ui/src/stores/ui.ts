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
  createdAt: number;
  status: 'pending' | 'confirmed' | 'failed';
};

const PENDING_TRANSACTIONS_TIMEOUT = 10 * 60 * 1000;
const PENDING_TRANSACTIONS_STORAGE_KEY = 'pendingTransactions';

function updateStorage(pendingTransactions: Map<string, PendingTransaction>) {
  console.log(pendingTransactions);
  lsSet(PENDING_TRANSACTIONS_STORAGE_KEY, pendingTransactions);
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: false,
    notifications: [] as Notification[],
    pendingTransactions: new Map<string, PendingTransaction>()
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
      this.pendingTransactions.set(txId, {
        networkId,
        txId,
        createdAt: Date.now(),
        status: 'pending'
      });
      updateStorage(this.pendingTransactions);

      try {
        await getNetwork(networkId).helpers.waitForTransaction(txId);
      } finally {
        this.pendingTransactions.delete(txId);
        updateStorage(this.pendingTransactions);
      }
    },
    async restorePendingTransactions() {
      let persistedTransactions: Map<string, PendingTransaction> = lsGet(
        PENDING_TRANSACTIONS_STORAGE_KEY,
        new Map()
      );

      if (Object.keys(persistedTransactions).length === 0) {
        persistedTransactions = new Map();
      }

      persistedTransactions.forEach((value, key) => {
        if (value.createdAt && value.createdAt + PENDING_TRANSACTIONS_TIMEOUT > Date.now()) {
          this.pendingTransactions.set(key, value);
        }
      });

      if (persistedTransactions.size !== this.pendingTransactions.size) {
        updateStorage(this.pendingTransactions);
      }

      this.pendingTransactions.forEach(async ({ networkId, txId }) => {
        try {
          await getNetwork(networkId).helpers.waitForTransaction(txId);
        } finally {
          this.pendingTransactions.delete(txId);
          updateStorage(this.pendingTransactions);
        }
      });
    }
  }
});
