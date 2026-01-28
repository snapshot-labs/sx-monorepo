import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { MaybeRefOrGetter } from 'vue';
import { abis } from '@/helpers/abis';
import {
  AUCTION_CONTRACT_ADDRESSES,
  AuctionNetworkId,
  Order,
  SellOrder
} from '@/helpers/auction';
import * as actions from '@/helpers/auction/actions';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { approve, deposit, getTokenAllowance } from '@/helpers/token';
import {
  getUserFacingErrorMessage,
  isUserAbortError,
  verifyNetwork
} from '@/helpers/utils';
import { METADATA as EVM_METADATA } from '@/networks/evm';

export function useAuctionActions(
  networkId: MaybeRefOrGetter<AuctionNetworkId>,
  auction: MaybeRefOrGetter<AuctionDetailFragment>
) {
  const uiStore = useUiStore();
  const { auth, web3Account } = useWeb3();
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

  const contractAddress = computed<string>(
    () => AUCTION_CONTRACT_ADDRESSES[toValue(networkId)]
  );

  async function getIsTokenApproved(sellOrder: SellOrder) {
    const allowance = await getTokenAllowance(
      auth.value!.provider,
      toValue(auction).addressBiddingToken,
      contractAddress.value
    );

    return allowance >= sellOrder.sellAmount;
  }

  async function wrapEth(sellOrder: SellOrder) {
    const contract = new Contract(
      toValue(auction).addressBiddingToken,
      abis.erc20,
      auth.value!.provider
    );

    const balance: BigNumber = await contract.balanceOf(web3Account.value);

    const missingBalance = sellOrder.sellAmount - balance.toBigInt();

    return wrapPromise(
      deposit(
        auth.value!.provider,
        toValue(auction).addressBiddingToken,
        missingBalance
      )
    );
  }

  async function approveToken(sellOrder: SellOrder) {
    return wrapPromise(
      approve(
        auth.value!.provider,
        toValue(auction).addressBiddingToken,
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

  async function wrapPromise(
    promise: Promise<any>,
    txChainId?: number
  ): Promise<string> {
    const tx = await promise;
    uiStore.addPendingTransaction(tx.hash, txChainId ?? chainId.value);

    return tx.hash;
  }

  return {
    getIsTokenApproved: wrapWithErrors(
      wrapWithAuthAndNetwork(getIsTokenApproved)
    ),
    approveToken: wrapWithErrors(wrapWithAuthAndNetwork(approveToken)),
    wrapEth: wrapWithErrors(wrapWithAuthAndNetwork(wrapEth)),
    placeSellOrder: wrapWithErrors(wrapWithAuthAndNetwork(placeSellOrder)),
    cancelSellOrder: wrapWithErrors(wrapWithAuthAndNetwork(cancelSellOrder)),
    claimFromParticipantOrder: wrapWithErrors(
      wrapWithAuthAndNetwork(claimFromParticipantOrder)
    )
  };
}
