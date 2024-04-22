import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { computedAsync, useMemoize } from '@vueuse/core';
import { Contract } from '@ethersproject/contracts';
import { getProvider } from '@/helpers/provider';

const getSafeVersion = useMemoize(async (networkKey: string, account: string) => {
  const provider = getProvider(Number(networkKey));
  const code = await provider.getCode(account);

  if (code === '0x') return undefined;

  const abi = ['function VERSION() view returns (string)'];
  const contract = new Contract(account, abi, provider);
  return contract.VERSION([]);
});

export function useSafeWallet(network: string) {
  const { web3 } = useWeb3();
  const auth = getInstance();
  const connectorName = computed(() => auth.provider.value?.connectorName);

  const networkKey = computed(() => web3.value.network.key);

  const spaceNetworkKey = computed(() => network);

  const isSafeContract = computedAsync(async () => {
    if (!web3.value.account) return false;

    const safeVersion = await getSafeVersion(networkKey.value, web3.value.account);

    return typeof safeVersion === 'string';
  }, false);

  const isSafeWallet = computed(() => connectorName.value === 'gnosis' || isSafeContract.value);

  const isInvalidNetwork = computed(() => {
    return isSafeWallet.value && networkKey.value !== spaceNetworkKey.value;
  });

  return {
    isSafeWallet,
    isInvalidNetwork
  };
}
