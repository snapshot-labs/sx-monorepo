import { SelectedStrategy, Transaction } from '@/types';

const spaceKey = ref<string | null>(null);
const network = ref<number | null>(null);
const executionStrategy = ref<SelectedStrategy | null>(null);
const transaction = ref<Transaction | null>(null);

export function useWalletConnectTransaction() {
  function setTransaction(
    _spaceKey: string,
    _network: number,
    _executionStrategy: SelectedStrategy | null,
    _tx: Transaction | null
  ) {
    spaceKey.value = _spaceKey;
    network.value = _network;
    executionStrategy.value = _executionStrategy;
    transaction.value = _tx;
  }

  function reset() {
    spaceKey.value = null;
    network.value = null;
    executionStrategy.value = null;
    transaction.value = null;
  }

  return {
    spaceKey,
    network,
    executionStrategy,
    transaction,
    setTransaction,
    reset
  };
}
