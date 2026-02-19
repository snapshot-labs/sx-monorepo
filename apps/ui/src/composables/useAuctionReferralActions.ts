import { MaybeRefOrGetter } from 'vue';
import { AuctionNetworkId } from '@/helpers/auction';
import {
  EIP712_DOMAIN,
  POSTER_TAG,
  SET_PARTNER_EIP712_TYPES
} from '@/helpers/auction/referral';
import { executionCall } from '@/helpers/mana';
import { pin } from '@/helpers/pin';
import { getUserFacingErrorMessage, isUserAbortError } from '@/helpers/utils';
import { verifyNetwork } from '@/helpers/walletNetworks';
import { METADATA as EVM_METADATA } from '@/networks/evm';

export function useAuctionReferralActions(
  networkId: MaybeRefOrGetter<AuctionNetworkId>
) {
  const uiStore = useUiStore();
  const { auth } = useWeb3();
  const { modalAccountOpen } = useModal();

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

  function wrapWithAuthAndNetwork<T extends any[], U>(
    fn: (...args: T) => Promise<U>,
    overrideChainId?: number
  ) {
    return async (...args: T): Promise<U | null> => {
      if (!auth.value) {
        modalAccountOpen.value = true;
        return null;
      }

      await verifyNetwork(
        auth.value.provider,
        overrideChainId ?? chainId.value
      );
      return fn(...args);
    };
  }

  const chainId = computed<number>(() => {
    return EVM_METADATA[toValue(networkId)].chainId;
  });

  async function setPartner(auctionTag: string, partner: string) {
    const signer = auth.value!.provider.getSigner();
    const signerAddress = await signer.getAddress();

    const domain = {
      ...EIP712_DOMAIN,
      chainId: chainId.value
    };

    const message = {
      auction_tag: auctionTag,
      partner: partner.toLowerCase()
    };

    const signature = await signer._signTypedData(
      domain,
      SET_PARTNER_EIP712_TYPES,
      message
    );

    const metadata = {
      method: 'SetAuctionPartner',
      signer: signerAddress.toLowerCase(),
      signature,
      domain,
      types: SET_PARTNER_EIP712_TYPES,
      message
    };

    const { cid } = await pin(metadata);

    return wrapPromise(
      executionCall('eth', domain.chainId, 'sendAuctionPartner', {
        metadataUri: `ipfs://${cid}`,
        posterTag: POSTER_TAG
      }),
      domain.chainId
    );
  }

  async function wrapPromise(
    promise: Promise<any>,
    txChainId?: number
  ): Promise<string> {
    const tx = await promise;
    uiStore.addPendingTransaction(tx.hash, txChainId ?? chainId.value);

    return tx.hash;
  }

  return {
    setPartner: wrapWithErrors(wrapWithAuthAndNetwork(setPartner))
  };
}
