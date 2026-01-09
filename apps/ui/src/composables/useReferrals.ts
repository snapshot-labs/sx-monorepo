import { MaybeRefOrGetter } from 'vue';
import { AuctionNetworkId } from '@/helpers/auction';
import {
  AUCTION_TAG,
  POSTER_TAG,
  REFERRAL_EIP712_DOMAIN,
  REFERRAL_EIP712_TYPES
} from '@/helpers/auction/referral';
import { executionCall } from '@/helpers/mana';
import { pin } from '@/helpers/pin';
import {
  getUserFacingErrorMessage,
  isUserAbortError,
  verifyNetwork
} from '@/helpers/utils';
import { METADATA as EVM_METADATA } from '@/networks/evm';

export function useReferrals(networkId: MaybeRefOrGetter<AuctionNetworkId>) {
  const uiStore = useUiStore();
  const { auth } = useWeb3();
  const { modalAccountOpen } = useModal();

  const chainId = computed<number>(() => {
    return EVM_METADATA[toValue(networkId)].chainId;
  });

  function wrapWithErrors<T extends any[], U>(fn: (...args: T) => Promise<U>) {
    return async (...args: T): Promise<U> => {
      try {
        return await fn(...args);
      } catch (e) {
        if (!isUserAbortError(e)) {
          console.error(e);
          uiStore.addNotification('error', getUserFacingErrorMessage(e));
        }

        throw e;
      }
    };
  }

  async function setReferee(referee: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    await verifyNetwork(auth.value.provider, chainId.value);

    const signer = auth.value.provider.getSigner();
    const signerAddress = await signer.getAddress();

    const domain = {
      ...REFERRAL_EIP712_DOMAIN,
      chainId: chainId.value
    };

    const message = {
      auction_tag: AUCTION_TAG,
      referee: referee.toLowerCase()
    };

    const signature = await signer._signTypedData(
      domain,
      REFERRAL_EIP712_TYPES,
      message
    );

    const metadata = {
      method: 'SetAuctionReferee',
      signer: signerAddress.toLowerCase(),
      signature,
      domain,
      types: REFERRAL_EIP712_TYPES,
      message
    };

    const { cid } = await pin(metadata);

    const tx = await executionCall('eth', domain.chainId, 'postReferral', {
      metadataUri: `ipfs://${cid}`,
      posterTag: POSTER_TAG
    });

    uiStore.addPendingTransaction(tx.hash, chainId.value);

    return tx.hash;
  }
  return { setReferee: wrapWithErrors(setReferee) };
}
