import { defineStore } from 'pinia';
import { currentNetwork } from '@/networks';
import { lsSet, lsGet } from '@/helpers/utils';

const PENDING_TRANSACTIONS_STORAGE_KEY = 'pendingTransactions';

function updateStorage(pendingTransactions: string[]) {
  lsSet(PENDING_TRANSACTIONS_STORAGE_KEY, pendingTransactions);
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: false,
    broadcastingTransactionsCount: 0,
    pendingTransactions: [] as string[]
  }),
  actions: {
    async toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },
    async addPendingTransaction(txId: string) {
      this.pendingTransactions.push(txId);
      updateStorage(this.pendingTransactions);

      try {
        await currentNetwork.helpers.waitForTransaction(txId);
      } finally {
        this.pendingTransactions = this.pendingTransactions.filter(el => el !== txId);
        updateStorage(this.pendingTransactions);
      }
    },
    async restorePendingTransactions() {
      this.pendingTransactions = lsGet(PENDING_TRANSACTIONS_STORAGE_KEY, []);

      this.pendingTransactions.forEach(async txId => {
        try {
          await currentNetwork.helpers.waitForTransaction(txId);
        } finally {
          this.pendingTransactions = this.pendingTransactions.filter(el => el !== txId);
          updateStorage(this.pendingTransactions);
        }
      });
    }
  }
});
