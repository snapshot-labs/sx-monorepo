import { Contract } from '@ethersproject/contracts';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { computedAsync, useMemoize } from '@vueuse/core';
import { getProvider } from '@/helpers/provider';
import { offchainNetworks } from '@/networks';
import { NetworkID } from '@/types';

const getSafeVersion = useMemoize(
  async (networkKey: string, account: string) => {
    const provider = getProvider(Number(networkKey));
    const code = await provider.getCode(account);

    if (code === '0x') return undefined;

    const abi = ['function VERSION() view returns (string)'];
    const contract = new Contract(account, abi, provider);
    return contract.VERSION([]);
  }
);

export function useSafeWallet(network: NetworkID, chainId = 1) {
  const { web3 } = useWeb3();
  const auth = getInstance();
  const connectorName = computed(() => auth.provider.value?.connectorName);

  const signedChainId = computed(() => web3.value.network.key);

  const isSafeContract = computedAsync(async () => {
    if (!web3.value.account) return false;

    const safeVersion = await getSafeVersion(
      signedChainId.value,
      web3.value.account
    );

    return typeof safeVersion === 'string';
  }, false);

  const isSafeWallet = computed(
    () => connectorName.value === 'gnosis' || isSafeContract.value
  );

  const isInvalidNetwork = computed(() => {
    return (
      isSafeWallet.value &&
      offchainNetworks.includes(network) &&
      Number(signedChainId.value) !== chainId
    );
  });

  return {
    isSafeWallet,
    isInvalidNetwork
  };
}
