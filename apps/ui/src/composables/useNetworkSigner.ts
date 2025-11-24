import { JsonRpcSigner } from '@ethersproject/providers';
import { MaybeRefOrGetter } from 'vue';
import { verifyNetwork } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

export function useNetworkSigner(networkId: MaybeRefOrGetter<NetworkID>) {
  const { auth } = useWeb3();
  const { modalAccountOpen } = useModal();

  async function getSigner(): Promise<JsonRpcSigner | null> {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const network = getNetwork(toValue(networkId));
    await verifyNetwork(auth.value.provider, Number(network.chainId));
    return auth.value.provider.getSigner();
  }

  return { getSigner };
}
