import { defineStore } from 'pinia';
import { getNetwork } from '@/networks';
import { lsSet, lsGet } from '@/helpers/utils';
import { NotificationType, NetworkID } from '@/types';

type Notification = {
  id: string;
  type: NotificationType;
  message: string;
};

type Transaction = {
  networkId: NetworkID;
  txId: string;
  createdAt: number;
  status: 'pending' | 'confirmed' | 'failed';
};

const PENDING_TRANSACTIONS_TIMEOUT = 10 * 60 * 1000;
const PENDING_TRANSACTIONS_STORAGE_KEY = 'pendingTransactions';

function updateStorage(transactions: Map<string, Transaction>) {
  lsSet(PENDING_TRANSACTIONS_STORAGE_KEY, transactions);
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: false,
    notifications: [] as Notification[],
    transactions: new Map<string, Transaction>()
  }),
  getters: {
    pendingTransactions: state =>
      Array.from(state.transactions.values()).filter(p => p.status === 'pending')
  },
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
      this.transactions.set(txId, {
        networkId,
        txId,
        createdAt: Date.now(),
        status: 'pending'
      });
      updateStorage(this.transactions);

      try {
        await getNetwork(networkId).helpers.waitForTransaction(txId);
        this.transactions.set(txId, {
          ...this.transactions.get(txId)!,
          status: 'confirmed'
        });
      } catch (e) {
        this.transactions.set(txId, {
          ...this.transactions.get(txId)!,
          status: 'failed'
        });
      } finally {
        updateStorage(this.transactions);
      }
    },
    async restorePendingTransactions() {
      let persistedTransactions: Map<string, Transaction> = lsGet(
        PENDING_TRANSACTIONS_STORAGE_KEY,
        new Map()
      );

      if (Object.keys(persistedTransactions).length === 0) {
        persistedTransactions = new Map();
      }

      persistedTransactions.forEach((value, key) => {
        if (value.createdAt && value.createdAt + PENDING_TRANSACTIONS_TIMEOUT > Date.now()) {
          this.transactions.set(key, value);
        }
      });

      if (persistedTransactions.size !== this.transactions.size) {
        updateStorage(this.transactions);
      }

      this.transactions.forEach(async ({ networkId, txId }) => {
        try {
          await getNetwork(networkId).helpers.waitForTransaction(txId);
        } finally {
          this.transactions.delete(txId);
          updateStorage(this.transactions);
        }
      });
    }
  }
});
