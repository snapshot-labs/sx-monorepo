import { MaybeRefOrGetter } from 'vue';
import {
  AUCTION_CONTRACT_ADDRESSES,
  AuctionNetworkId,
  Order,
  SellOrder
} from '@/helpers/auction';
import * as actions from '@/helpers/auction/actions';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { approve, getIsApproved, Token } from '@/helpers/token';
import {
  getUserFacingErrorMessage,
  isUserAbortError,
  verifyNetwork
} from '@/helpers/utils';
import { METADATA as EVM_METADATA } from '@/networks/evm';

function getBiddingToken(auction: AuctionDetailFragment): Token {
  return {
    contractAddress: auction.addressBiddingToken,
    decimals: Number(auction.decimalsBiddingToken),
    symbol: auction.symbolBiddingToken
  };
}

export function useAuctionActions(
  networkId: MaybeRefOrGetter<AuctionNetworkId>,
  auction: MaybeRefOrGetter<AuctionDetailFragment>
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
    fn: (...args: T) => Promise<U>
  ) {
    return async (...args: T): Promise<U | null> => {
      if (!auth.value) {
        modalAccountOpen.value = true;
        return null;
      }

      await verifyNetwork(auth.value.provider, chainId.value);
      return fn(...args);
    };
  }

  const chainId = computed<number>(() => {
    return EVM_METADATA[toValue(networkId)].chainId;
  });

  const contractAddress = computed<string>(
    () => AUCTION_CONTRACT_ADDRESSES[toValue(networkId)]
  );

  async function getIsTokenApproved(sellOrder: SellOrder) {
    return getIsApproved(
      getBiddingToken(toValue(auction)),
      auth.value!.provider,
      contractAddress.value,
      sellOrder.sellAmount
    );
  }

  async function approveToken(sellOrder: SellOrder) {
    return wrapPromise(
      approve(
        getBiddingToken(toValue(auction)),
        auth.value!.provider,
        contractAddress.value,
        sellOrder.sellAmount
      )
    );
  }

  async function placeSellOrder(sellOrder: SellOrder) {
    return wrapPromise(
      actions.placeSellOrder(
        auth.value!.provider,
        toValue(auction),
        toValue(networkId),
        sellOrder
      )
    );
  }

  async function cancelSellOrder(order: Order) {
    return wrapPromise(
      actions.cancelSellOrder(
        auth.value!.provider,
        toValue(auction),
        toValue(networkId),
        order
      )
    );
  }

  async function claimFromParticipantOrder(orders: Order[]) {
    return wrapPromise(
      actions.claimFromParticipantOrder(
        auth.value!.provider,
        toValue(networkId),
        toValue(auction),
        orders
      )
    );
  }

  async function wrapPromise(promise: Promise<any>): Promise<string> {
    const tx = await promise;
    uiStore.addPendingTransaction(tx.hash, chainId.value);

    return tx.hash;
  }

  return {
    getIsTokenApproved: wrapWithErrors(
      wrapWithAuthAndNetwork(getIsTokenApproved)
    ),
    approveToken: wrapWithErrors(wrapWithAuthAndNetwork(approveToken)),
    placeSellOrder: wrapWithErrors(wrapWithAuthAndNetwork(placeSellOrder)),
    cancelSellOrder: wrapWithErrors(wrapWithAuthAndNetwork(cancelSellOrder)),
    claimFromParticipantOrder: wrapWithErrors(
      wrapWithAuthAndNetwork(claimFromParticipantOrder)
    )
  };
}
