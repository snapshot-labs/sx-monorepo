import { Contract } from '@ethersproject/contracts';
import { computedAsync, useMemoize } from '@vueuse/core';
import { getIsContract } from '@/helpers/contracts';
import { getProvider } from '@/helpers/provider';
import { offchainNetworks } from '@/networks';
import { NetworkID } from '@/types';

const getSafeVersion = useMemoize(
  async (networkKey: string, account: string) => {
    const provider = getProvider(networkKey);

    const isContract = await getIsContract(provider, account);
    if (!isContract) return undefined;

    const abi = ['function VERSION() view returns (string)'];
    const contract = new Contract(account, abi, provider);
    return contract.VERSION([]);
  }
);

export function useSafeWallet(network: NetworkID, chainId = '1') {
  const { web3, auth } = useWeb3();

  const signedChainId = computed<string>(() =>
    String(web3.value.network.chainId)
  );

  const isSafeContract = computedAsync(async () => {
    if (!web3.value.account) return false;

    const safeVersion = await getSafeVersion(
      signedChainId.value,
      web3.value.account
    );

    return typeof safeVersion === 'string';
  }, false);

  const isSafeWallet = computed(
    () => auth.value?.connector.type === 'gnosis' || isSafeContract.value
  );

  const isInvalidNetwork = computed(() => {
    return (
      isSafeWallet.value &&
      offchainNetworks.includes(network) &&
      signedChainId.value !== chainId
    );
  });

  return {
    isSafeWallet,
    isInvalidNetwork
  };
}
