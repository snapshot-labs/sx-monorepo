import { defineStore } from 'pinia';
import { lsGet, lsSet } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID, NotificationType } from '@/types';

type SafeModal = {
  id: string;
  type: 'vote' | 'propose' | 'transaction';
  showVerifierLink: boolean;
};

type Notification = {
  id: string;
  type: NotificationType;
  message: string;
};

type PendingTransaction = {
  networkId: NetworkID;
  txId: string;
  createdAt: number;
};

const PENDING_TRANSACTIONS_TIMEOUT = 10 * 60 * 1000;
const PENDING_TRANSACTIONS_STORAGE_KEY = 'pendingTransactions';

function updateStorage(pendingTransactions: PendingTransaction[]) {
  lsSet(PENDING_TRANSACTIONS_STORAGE_KEY, pendingTransactions);
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sideMenuOpen: false,
    safeModal: null as SafeModal | null,
    notifications: [] as Notification[],
    pendingTransactions: [] as PendingTransaction[]
  }),
  actions: {
    async toggleSidebar() {
      this.sideMenuOpen = !this.sideMenuOpen;
    },
    openSafeModal(data: Omit<SafeModal, 'id'>) {
      this.safeModal = { id: crypto.randomUUID(), ...data };
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
      this.notifications = this.notifications.filter(
        notification => notification.id !== id
      );
    },
    async addPendingTransaction(txId: string, networkId: NetworkID) {
      this.pendingTransactions.push({
        networkId,
        txId,
        createdAt: Date.now()
      });
      updateStorage(this.pendingTransactions);

      try {
        await getNetwork(networkId).helpers.waitForTransaction(txId);
      } finally {
        this.pendingTransactions = this.pendingTransactions.filter(
          el => el.txId !== txId
        );
        updateStorage(this.pendingTransactions);
      }
    },
    async restorePendingTransactions() {
      const persistedTransactions = lsGet(PENDING_TRANSACTIONS_STORAGE_KEY, []);

      this.pendingTransactions = persistedTransactions.filter(
        tx =>
          tx.createdAt &&
          tx.createdAt + PENDING_TRANSACTIONS_TIMEOUT > Date.now()
      );

      if (persistedTransactions.length !== this.pendingTransactions.length) {
        updateStorage(this.pendingTransactions);
      }

      this.pendingTransactions.forEach(async ({ networkId, txId }) => {
        try {
          await getNetwork(networkId).helpers.waitForTransaction(txId);
        } finally {
          this.pendingTransactions = this.pendingTransactions.filter(
            el => el.txId !== txId
          );
          updateStorage(this.pendingTransactions);
        }
      });
    }
  }
});
