import { toast } from '@ui-sdk/vue/toast';
import { defineStore } from 'pinia';
import { waitForTransaction } from '@/helpers/generic';
import { lsGet, lsSet } from '@/helpers/utils';
import { ChainId, NotificationType } from '@/types';

type SafeModal = {
  id: string;
  type: 'vote' | 'propose' | 'transaction';
  showVerifierLink: boolean;
};

type PendingTransaction = {
  chainId: ChainId;
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
      toast[type](message, { duration: timeout });
    },
    async addPendingTransaction(txId: string, chainId: ChainId) {
      this.pendingTransactions.push({
        chainId,
        txId,
        createdAt: Date.now()
      });
      updateStorage(this.pendingTransactions);

      try {
        await waitForTransaction(txId, chainId);
      } finally {
        this.pendingTransactions = this.pendingTransactions.filter(
          el => el.txId !== txId
        );
        updateStorage(this.pendingTransactions);
      }
    },
    async restorePendingTransactions() {
      const persistedTransactions: PendingTransaction[] = lsGet(
        PENDING_TRANSACTIONS_STORAGE_KEY,
        []
      );

      this.pendingTransactions = persistedTransactions.filter(
        tx =>
          tx.createdAt &&
          tx.createdAt + PENDING_TRANSACTIONS_TIMEOUT > Date.now()
      );

      if (persistedTransactions.length !== this.pendingTransactions.length) {
        updateStorage(this.pendingTransactions);
      }

      this.pendingTransactions.forEach(async ({ chainId, txId }) => {
        try {
          await waitForTransaction(txId, chainId);
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
