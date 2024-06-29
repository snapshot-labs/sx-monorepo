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

function updateStorage(transactions: Record<string, Transaction>) {
  const filteredTransactions = Object.fromEntries(
    Object.entries(transactions).filter(([, tx]) => tx.status === 'pending')
  );

  lsSet(PENDING_TRANSACTIONS_STORAGE_KEY, filteredTransactions);
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: false,
    notifications: [] as Notification[],
    transactions: {} as Record<string, Transaction>
  }),
  getters: {
    pendingTransactions: state =>
      Object.values(state.transactions).filter(tx => tx.status === 'pending')
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
      this.transactions[txId] = {
        networkId,
        txId,
        createdAt: Date.now(),
        status: 'pending'
      };
      updateStorage(this.transactions);

      try {
        await getNetwork(networkId).helpers.waitForTransaction(txId);
        this.transactions[txId].status = 'confirmed';
      } catch (e) {
        this.transactions[txId].status = 'failed';
      } finally {
        updateStorage(this.transactions);
      }
    },
    async restorePendingTransactions() {
      const persistedTransactions: Record<string, Transaction> = lsGet(
        PENDING_TRANSACTIONS_STORAGE_KEY,
        {}
      );

      Object.values(persistedTransactions).forEach(tx => {
        if (tx.createdAt + PENDING_TRANSACTIONS_TIMEOUT > Date.now()) {
          this.addPendingTransaction(tx.txId, tx.networkId);
        }
      });
    }
  }
});
